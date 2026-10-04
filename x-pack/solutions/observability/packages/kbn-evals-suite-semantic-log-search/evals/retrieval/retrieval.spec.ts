/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate, tags } from '@kbn/evals';
import { resolveCorpus, resolveCorpusWindow } from '../../src/corpora';
import {
  assertCorpusIsLabelled,
  assertSemanticSearchAvailable,
  auditCorpus,
  logRunManifest,
  readRerankAllocations,
  refreshCorpus,
  seedCorpusIfNeeded,
} from '../../src/corpus_audit';
import { logArmComparison } from '../../src/arm_comparison';
import { datasetFor, FAMILIES } from '../../src/datasets';
import { countSanityEvaluator, retrievalEvaluators } from '../../src/retrieval/evaluators';
import { toKeywordFilter } from '../../src/retrieval/keyword_filter';
import {
  executeGetLogGroups,
  executeGetLogs,
  executeGetLogsSemantic,
} from '../../src/retrieval/tool_client';
import type { RetrievalTaskOutput } from '../../src/retrieval/types';

/** Resolved once at module load; all tests in this file use the same corpus. */
const corpus = resolveCorpus();

/**
 * The same corpus with its window resolved to absolute timestamps, set in `beforeAll` once seeding
 * is done. Both arms read this rather than `corpus`, so they measure an identical window.
 */
let activeCorpus = corpus;

/** Set in `beforeAll`; the ceiling for `countSanityEvaluator` and part of the run metadata. */
let auditTotalDocuments = 0;

/**
 * The reranker saturates at one in-flight request, so the executor's default of 5 concurrent
 * examples makes every latency measurement include time spent queueing behind the others. One at a
 * time is slower to run and is the only way the numbers mean anything.
 */
const RETRIEVAL_CONCURRENCY = 1;

/**
 * Run context attached to each experiment.
 *
 * Not persisted: the framework ingests a fixed metadata set (`execution_id`, `suite_id`,
 * `total_repetitions`, `hostname`, `git`) and drops everything passed here, which a stored score
 * document confirms. `logRunManifest` is the provenance record; this stays for the in-memory
 * experiment result and for whenever the framework starts ingesting it.
 */
const runMetadata = () => ({
  corpusId: activeCorpus.id,
  windowStart: activeCorpus.timeRange.start,
  windowEnd: activeCorpus.timeRange.end,
  auditedDocuments: auditTotalDocuments,
  concurrency: RETRIEVAL_CONCURRENCY,
});

/**
 * Retrieval quality, measured with no model in the loop.
 *
 * Both arms call their tool through the tool execution API rather than an agent, and both run over
 * the window resolved once in `beforeAll`, so the only variable between them is which one ranked
 * the results.
 *
 * Across runs they are still not comparable: the window follows the freshly seeded data, and the
 * semantic arm inherits an unseeded ES|QL `SAMPLE` once a corpus is large enough for sampling to
 * engage. Compare arms within a run.
 */
evaluate.describe(
  'Semantic log search: retrieval',
  { tag: tags.serverless.observability.complete },
  () => {
    evaluate.beforeAll(async ({ esClient, log }) => {
      // Seeding uses the profile's relative range, and writes up to the moment it finishes, so the
      // window has to be resolved after it rather than before.
      if (seedCorpusIfNeeded(await auditCorpus({ esClient, corpus, log }), corpus, log)) {
        log.debug('Corpus was re-seeded; resolving the window against the new data');
        await refreshCorpus({ esClient, corpus });
      }

      activeCorpus = resolveCorpusWindow(corpus);

      const audit = await auditCorpus({ esClient, corpus: activeCorpus, log });
      assertCorpusIsLabelled(audit, activeCorpus);
      auditTotalDocuments = audit.totalDocuments;
      await logRunManifest({ esClient, corpus: activeCorpus, audit, log });
    });

    // The framework's own table is execution-scoped and grouped by dataset, and the arms share one
    // dataset, so its row is an average across them. This is the per-arm view.
    evaluate.afterAll(async ({ esClient, log }) => {
      await logArmComparison({
        esClient,
        datasetName: datasetFor(activeCorpus, FAMILIES.retrieval).name,
        log,
      });
    });

    evaluate('keyword arm', async ({ executorClient, fetch, log, connector }) => {
      await executorClient.runExperiment(
        {
          name: 'retrieval-keyword',
          datasets: [datasetFor(activeCorpus, FAMILIES.retrieval)],
          metadata: runMetadata(),
          concurrency: RETRIEVAL_CONCURRENCY,
          task: async ({ input }): Promise<RetrievalTaskOutput> =>
            executeGetLogs({
              fetch,
              log,
              connectorId: connector.id,
              corpus: activeCorpus,
              kqlFilter: toKeywordFilter(input!.question),
            }),
        },
        [...retrievalEvaluators(activeCorpus), countSanityEvaluator(auditTotalDocuments)]
      );
    });

    // Same question as the other two arms, through the only query input this tool has. Paired with
    // the keyword arm it isolates the output shape; paired with the semantic arm it isolates the
    // ranking, since both then receive the question and differ only in how they use it.
    evaluate('groups arm', async ({ executorClient, fetch, log, connector }) => {
      await executorClient.runExperiment(
        {
          name: 'retrieval-groups',
          datasets: [datasetFor(activeCorpus, FAMILIES.retrieval)],
          metadata: runMetadata(),
          concurrency: RETRIEVAL_CONCURRENCY,
          task: async ({ input }): Promise<RetrievalTaskOutput> =>
            executeGetLogGroups({
              fetch,
              log,
              connectorId: connector.id,
              corpus: activeCorpus,
              kqlFilter: toKeywordFilter(input!.question),
            }),
        },
        [...retrievalEvaluators(activeCorpus), countSanityEvaluator(auditTotalDocuments)]
      );
    });

    evaluate('semantic arm', async ({ executorClient, esClient, fetch, log, connector }) => {
      await assertSemanticSearchAvailable({
        fetch,
        connectorId: connector.id,
        corpus: activeCorpus,
        log,
      });
      await executorClient.runExperiment(
        {
          name: 'retrieval-semantic',
          datasets: [datasetFor(activeCorpus, FAMILIES.retrieval)],
          metadata: runMetadata(),
          concurrency: RETRIEVAL_CONCURRENCY,
          task: async ({ input }): Promise<RetrievalTaskOutput> =>
            executeGetLogsSemantic({
              fetch,
              log,
              connectorId: connector.id,
              corpus: activeCorpus,
              semanticFilter: input!.question,
            }),
        },
        [...retrievalEvaluators(activeCorpus), countSanityEvaluator(auditTotalDocuments)]
      );

      // Read after the arm, not in `beforeAll`: the reranker deploys on its first call, and this is
      // the only arm that makes one, so before this point the answer is always "not deployed".
      const allocations = await readRerankAllocations(esClient);
      log.info(
        `Reranker allocations after the semantic arm: ${allocations ?? 'not deployed'}. ` +
          `Rerank latency divides by this, so quote it with any latency figure.`
      );
    });
  }
);
