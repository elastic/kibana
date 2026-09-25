/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execSync, spawnSync } from 'child_process';
import type { Client } from '@elastic/elasticsearch';
import type { HttpHandler } from '@kbn/core/public';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ToolingLog } from '@kbn/tooling-log';
import type { CorpusProfile } from './corpora';
import { allLabels } from './corpora';
import { executeGetLogsSemantic } from './retrieval/tool_client';

/**
 * The RERANK inference endpoint preconfigured in ES 9.3+; checked for run manifest only.
 *
 * This is the eval's assumption about the server's default, not a read of it. Kibana takes the
 * endpoint from `xpack.logsDataAccess.semanticLogSearch.rerankInferenceId`, so a run against a
 * Kibana configured otherwise will rank through an endpoint this manifest never inspected.
 */
const RERANK_ENDPOINT = '.rerank-v1-elasticsearch';

/** The local model behind the default endpoint. Its deployment stats are where allocations live. */
const RERANK_MODEL_ID = '.rerank-v1';

/**
 * Allocation count of the local reranker's deployment, or undefined when it is not deployed.
 * Quote it with any latency figure: rerank cost divides by it, and `adaptive_allocations` moves it
 * mid-run on its own. Call it after a rerank has happened, since the model deploys on first use.
 */
export const readRerankAllocations = async (esClient: Client): Promise<number | undefined> => {
  try {
    const stats = await esClient.ml.getTrainedModelsStats({ model_id: RERANK_MODEL_ID });
    return stats.trained_model_stats?.[0]?.deployment_stats?.number_of_allocations;
  } catch {
    // Absent, undeployed or unauthorized, all recorded the same way: the manifest reports what
    // this run could see, not what the cluster has.
    return undefined;
  }
};

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

/**
 * Documents pulled back per label to re-confirm the phrase match as a substring.
 * Large enough that a label ranked outside the first few hits is not reported missing, which
 * would fail the run; one confirmed sample is enough, since the audit only asks whether the label
 * is present at all.
 */
const SAMPLES_PER_LABEL = 20;

/**
 * Counts how many documents carry each ground truth label.
 *
 * Labels are substrings, but counting substrings over `match_only_text` is not cheap, so the
 * count comes from a `match_phrase` on the label's tokens and is then confirmed against sampled
 * `_source` values with the same predicate the evaluators use. A label that phrase-matches but
 * never matches as a substring counts as missing, because the evaluators would never score it.
 *
 * `ignore_unavailable` is what lets this run before the corpus exists. The audit is called first to
 * decide whether `seedCorpusIfNeeded` has to seed, so on a freshly started stack the target is
 * absent and a bare query answers `index_not_found_exception`. A missing target is zero documents,
 * which is exactly the answer that triggers seeding.
 */
export const auditCorpus = async ({ esClient, corpus, log }: AuditParams): Promise<CorpusAudit> => {
  const { target, timeRange } = corpus;
  const timeRangeFilter = { range: { '@timestamp': { gte: timeRange.start, lte: timeRange.end } } };

  const corpusLabels = allLabels(corpus);
  const labels = await Promise.all(
    corpusLabels.map(async (label): Promise<LabelAudit> => {
      const response = await esClient.search<{ message?: string }>({
        index: target,
        ignore_unavailable: true,
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
    ignore_unavailable: true,
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
 * Runs the corpus's `setupCommand` when the audit shows the data is absent or belongs to another
 * corpus, and reports whether it did.
 *
 * Throws on a failed seed rather than reporting it, so the caller reaches
 * `assertCorpusIsLabelled` and a broken seed produces the same diagnostic as a missing corpus.
 */
export const seedCorpusIfNeeded = (
  priorAudit: CorpusAudit,
  corpus: CorpusProfile,
  log: ToolingLog
): boolean => {
  // A non-empty index is not enough to skip seeding: the corpora share one data stream, so
  // another corpus's data reads as present but unlabelled.
  if (priorAudit.totalDocuments > 0 && priorAudit.missing.length === 0) {
    return false;
  }

  const reason =
    priorAudit.totalDocuments === 0
      ? `Corpus "${corpus.target}" is empty`
      : `Corpus "${corpus.target}" has ${priorAudit.missing.length} missing labels (previous corpus data?)`;

  // The corpus profiles hardcode the Scout defaults, so seeding a non-local stack means
  // rewriting them from the environment.
  const esUrl = process.env.ES_URL ?? 'http://elastic:changeme@localhost:9220';
  const kibanaUrl = process.env.KIBANA_URL ?? 'http://elastic:changeme@localhost:5620';
  const cmd = corpus.setupCommand
    .replace(/http:\/\/elastic:changeme@localhost:9220/g, esUrl)
    .replace(/http:\/\/elastic:changeme@localhost:5620/g, kibanaUrl);

  log.info(`${reason}, seeding with:\n\n${cmd}\n`);

  const result = spawnSync('bash', ['-c', cmd], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
    timeout: 5 * 60 * 1000,
  });

  if (result.status !== 0) {
    throw new Error(
      `Corpus seeding failed (exit ${result.status ?? 'signal'}). ` +
        `Run the command manually to diagnose:\n\n${cmd}\n`
    );
  }

  log.info(`Corpus seeded successfully.`);
  return true;
};

/**
 * Asserts that semantic log search can serve requests on this cluster, by asking it to.
 *
 * Probing the tool rather than checking for a specific inference endpoint keeps this valid for
 * whatever strategy the service selects, so a later strategy does not need a new pre-flight.
 * Requires a corpus that already has data, since an empty result is only unambiguous evidence of
 * an unavailable service once the data is known to be there; a probe that matches nothing is
 * logged and allowed.
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
      `Semantic arm pre-flight failed, the service threw on a probe query:\n${message}\n` +
        `Ensure the cluster has the required capabilities for semantic log search.`
    );
  }

  if (result.warnings.length > 0 && result.patterns.length === 0) {
    const warnings = result.warnings.map((w) => `  - ${w}`).join('\n');

    // A target that matches no indices is a missing corpus, not a broken service, and this check
    // runs before seeding. Reporting it as "unavailable on this cluster" sends the reader to look at
    // cluster capabilities when the fix is to seed the data.
    if (result.warnings.some((w) => w.includes('No indices matched'))) {
      throw new Error(
        `Semantic arm pre-flight found no data to search. Service warnings:\n${warnings}\n\n` +
          `Seed the corpus first:\n\n${corpus.setupCommand}\n`
      );
    }

    throw new Error(
      `Semantic log search is unavailable on this cluster. Service warnings:\n${warnings}` +
        `\n\nEnsure the cluster has the required capabilities for semantic log search.`
    );
  }

  log.debug(
    `Semantic arm pre-flight passed (${result.patterns.length} patterns, ` +
      `${result.latencyMs}ms, ${result.warnings.length} warnings).`
  );
};

/**
 * Emits a one-time manifest so a set of scores stays attributable to the cluster, corpus and
 * build that produced it.
 *
 * Every lookup here is provenance, never a gate: the RERANK check records which endpoint existed,
 * and `assertSemanticSearchAvailable` decides whether the run may proceed.
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
    // Absent or unauthorized, both recorded the same way: the manifest reports what this run
    // could see, not what the cluster has.
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
