/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execSync, spawnSync } from 'child_process';
import path from 'path';
import type { Client } from '@elastic/elasticsearch';
import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import type { CorpusProfile } from './corpora';
import { allLabels } from './corpora';
import { executeGetLogsSemantic } from './retrieval/tool_client';

/** The RERANK inference endpoint preconfigured in ES 9.3+; checked for run manifest only. */
const RERANK_ENDPOINT = '.rerank-v1-elasticsearch';

export interface LabelAudit {
  label: string;
  /** Documents whose `message` contains the label, as an exact substring. */
  documents: number;
}

export interface CorpusAudit {
  labels: LabelAudit[];
  missing: string[];
  totalDocuments: number;
}

interface AuditParams {
  esClient: Client;
  corpus: CorpusProfile;
  log: ToolingLog;
}

/** Sampled per label; only used to confirm the substring is really there. */
const SAMPLES_PER_LABEL = 5;

/**
 * Counts how many documents carry each ground truth label.
 *
 * Labels are substrings, but Elasticsearch cannot count substrings over
 * `match_only_text` cheaply, so the count comes from a `match_phrase` on the
 * label's tokens and is then confirmed against sampled `_source` values using the
 * same substring predicate the evaluators use. A label that phrase-matches but
 * never matches as a substring is reported as missing, because the evaluators
 * would never score it.
 */
export const auditCorpus = async ({ esClient, corpus, log }: AuditParams): Promise<CorpusAudit> => {
  const { target, timeRange } = corpus;
  const timeRangeFilter = { range: { '@timestamp': { gte: timeRange.start, lte: timeRange.end } } };

  const corpusLabels = allLabels(corpus);
  const labels = await Promise.all(
    corpusLabels.map(async (label): Promise<LabelAudit> => {
      const response = await esClient.search<{ message?: string }>({
        index: target,
        size: SAMPLES_PER_LABEL,
        track_total_hits: true,
        query: {
          bool: { filter: [timeRangeFilter, { match_phrase: { message: label } }] },
        },
        _source: ['message'],
      });

      const confirmed = response.hits.hits.some((hit) =>
        (hit._source?.message ?? '').toLowerCase().includes(label.toLowerCase())
      );

      const total = response.hits.total;
      const documents =
        confirmed && typeof total === 'object' ? total.value : confirmed ? Number(total) : 0;

      return { label, documents };
    })
  );

  const totals = await esClient.count({
    index: target,
    query: { bool: { filter: [timeRangeFilter] } },
  });

  const missing = labels.filter(({ documents }) => documents === 0).map(({ label }) => label);

  log.info(
    `Corpus audit on "${target}": ${totals.count} documents, ${labels.length - missing.length}/${
      labels.length
    } labels present`
  );

  for (const { label, documents } of labels) {
    log.debug(`  ${documents.toString().padStart(6)}  ${label}`);
  }

  return { labels, missing, totalDocuments: totals.count };
};

/**
 * Seeds the corpus when `auditCorpus` finds no documents in the target index.
 *
 * Executes the corpus's `setupCommand` via `bash -c` from the Kibana repo root.
 * Returns `true` when seeding was performed, `false` when the corpus was already
 * present (no seeding needed).
 *
 * Propagates errors — the caller should fall through to `assertCorpusIsLabelled`
 * so that a failed seed produces the same diagnostic as a missing corpus.
 */
export const seedCorpusIfAbsent = (
  priorAudit: CorpusAudit,
  corpus: CorpusProfile,
  log: ToolingLog
): boolean => {
  if (priorAudit.totalDocuments > 0) {
    return false;
  }

  log.info(`Corpus "${corpus.target}" is empty — seeding with:\n\n${corpus.setupCommand}\n`);

  // Resolve the Kibana repo root relative to this file's compiled location.
  // __dirname resolves to the compiled `target/` directory; walk up to the package root
  // and then four levels to the repo root (pkg → packages → observability → solutions → x-pack → kibana).
  const pkgRoot = path.resolve(__dirname, '..', '..', '..', '..', '..', '..', '..', '..');

  const result = spawnSync('bash', ['-c', corpus.setupCommand], {
    cwd: pkgRoot,
    stdio: 'inherit',
    timeout: 5 * 60 * 1000,
  });

  if (result.status !== 0) {
    throw new Error(
      `Corpus seeding failed (exit ${result.status ?? 'signal'}). ` +
        `Run the command manually to diagnose:\n\n${corpus.setupCommand}\n`
    );
  }

  log.info(`Corpus seeded successfully.`);
  return true;
};

/**
 * Asserts that the semantic log search service can serve requests on this cluster.
 *
 * Executes the semantic tool with a probe query and fails loudly if the service
 * returns `unavailable` (empty result + warnings). This is strategy-agnostic: it
 * asks "can you serve this?" rather than checking for a specific ES endpoint, so it
 * works on both RERANK clusters (M1) and AI-index clusters (M2).
 *
 * Must run after `assertCorpusIsLabelled` so the corpus is known to have data.
 * Ambiguous empty results (no patterns, no warnings) are logged but do not fail,
 * because a very specific probe question may genuinely match nothing.
 */
export const assertSemanticSearchAvailable = async ({
  fetch,
  connectorId,
  corpus,
  log,
}: {
  fetch: HttpHandler;
  connectorId: string;
  corpus: CorpusProfile;
  log: ToolingLog;
}): Promise<void> => {
  const probeQuery = corpus.queries.find((q) => q.kind === 'semantic') ?? corpus.queries[0];

  let result;
  try {
    result = await executeGetLogsSemantic({
      fetch,
      log,
      connectorId,
      corpus,
      semanticFilter: probeQuery.question,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Semantic arm pre-flight failed — the service threw an error on a probe query:\n${message}\n` +
        `Ensure the cluster has the required capabilities for semantic log search.`
    );
  }

  if (result.warnings.length > 0 && result.patterns.length === 0) {
    throw new Error(
      `Semantic log search is unavailable on this cluster. Service warnings:\n` +
        result.warnings.map((w) => `  - ${w}`).join('\n') +
        `\n\nEnsure the cluster has the required capabilities for semantic log search.`
    );
  }

  log.debug(
    `Semantic arm pre-flight passed (${result.patterns.length} patterns, ` +
      `${result.latencyMs}ms, ${result.warnings.length} warnings).`
  );
};

/**
 * Emits a one-time run manifest so two results from different clusters are
 * attributable without ambiguity.
 *
 * Records: corpus identity, query window, document count from the audit, ES
 * version, whether the RERANK endpoint is available (provenance, not a gate),
 * and the git commit. The RERANK check here is purely informational — it does not
 * fail the run; `assertSemanticSearchAvailable` is the availability gate.
 */
export const logRunManifest = async ({
  esClient,
  corpus,
  audit,
  log,
}: {
  esClient: Client;
  corpus: CorpusProfile;
  audit: CorpusAudit;
  log: ToolingLog;
}): Promise<void> => {
  let esVersion = 'unknown';
  try {
    const info = await esClient.info();
    esVersion = info.version.number;
  } catch {
    // non-fatal
  }

  let hasRerank = false;
  try {
    const r = await esClient.inference.get({ inference_id: RERANK_ENDPOINT });
    hasRerank = (r.endpoints?.length ?? 0) > 0;
  } catch {
    // absent or unauthorized — treat as unavailable
  }

  let commit = process.env.BUILDKITE_COMMIT ?? process.env.GIT_COMMIT ?? 'unknown';
  if (commit === 'unknown') {
    try {
      commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    } catch {
      // not in a git repo or git not available
    }
  }

  log.info(
    [
      'Run manifest:',
      `  corpus:    ${corpus.id}`,
      `  target:    ${corpus.target}`,
      `  window:    ${corpus.timeRange.start} → ${corpus.timeRange.end}`,
      `  documents: ${audit.totalDocuments}`,
      `  labels:    ${audit.labels.length - audit.missing.length}/${audit.labels.length} present`,
      `  rerank:    ${hasRerank ? `available (${RERANK_ENDPOINT})` : 'absent'}`,
      `  es:        ${esVersion}`,
      `  commit:    ${commit}`,
    ].join('\n')
  );
};

/**
 * Fails the run when the corpus does not carry the ground truth, rather than
 * letting every metric silently report zero.
 */
export const assertCorpusIsLabelled = (audit: CorpusAudit, corpus: CorpusProfile): void => {
  const { target, setupCommand } = corpus;

  if (audit.totalDocuments === 0) {
    throw new Error(
      `No documents found in "${target}". Generate the corpus first:\n\n${setupCommand}\n`
    );
  }

  if (audit.missing.length > 0) {
    throw new Error(
      `${audit.missing.length} ground truth labels are missing from "${target}", so every metric ` +
        `derived from them would be meaningless:\n` +
        audit.missing.map((label) => `  - ${label}`).join('\n') +
        `\n\nRegenerate the corpus with the pinned scenario and seed:\n\n${setupCommand}\n`
    );
  }
};
