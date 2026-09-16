/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { CorpusProfile } from './corpora';
import { allLabels } from './corpora';

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
