/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate, tags } from '@kbn/evals';
import { resolveCorpus } from '../../src/corpora';
import {
  assertCorpusIsLabelled,
  assertSemanticSearchAvailable,
  auditCorpus,
  logRunManifest,
  seedCorpusIfAbsent,
} from '../../src/corpus_audit';
import { datasetForArm } from '../../src/datasets';
import { countSanityEvaluator, retrievalEvaluators } from '../../src/retrieval/evaluators';
import { toKeywordFilter } from '../../src/retrieval/keyword_filter';
import { executeGetLogs, executeGetLogsSemantic } from '../../src/retrieval/tool_client';
import type { RetrievalTaskOutput } from '../../src/retrieval/types';
import { ARMS } from '../../src/types';

/** Resolved once at module load; all tests in this file use the same corpus. */
const corpus = resolveCorpus();

/**
 * Retrieval quality, measured with no model in the loop.
 *
 * The keyword arm calls `observability.get_logs` and the semantic arm calls
 * `observability.get_logs_semantic`, both through the tool execution API, so
 * the ranking is deterministic and the only variable is which path is used.
 * Latency is measured at the fetch layer (Retrieval Latency evaluator) and
 * recorded alongside quality metrics so M2 vs M1 latency comparisons are
 * available without routing through the agent arm.
 */
evaluate.describe(
  'Semantic log search: retrieval',
  { tag: tags.serverless.observability.complete },
  () => {
    /** Set in beforeAll; consumed by countSanityEvaluator in both arm callbacks. */
    let auditTotalDocuments = 0;

    evaluate.beforeAll(async ({ esClient, log }) => {
      let audit = await auditCorpus({ esClient, corpus, log });
      if (seedCorpusIfAbsent(audit, corpus, log)) {
        audit = await auditCorpus({ esClient, corpus, log });
      }
      assertCorpusIsLabelled(audit, corpus);
      auditTotalDocuments = audit.totalDocuments;
      await logRunManifest({ esClient, corpus, audit, log });
    });

    evaluate('keyword arm', async ({ executorClient, fetch, log, connector }) => {
      await executorClient.runExperiment(
        {
          name: 'retrieval-keyword',
          datasets: [datasetForArm(ARMS.keyword, corpus)],
          task: async ({ input }): Promise<RetrievalTaskOutput> =>
            executeGetLogs({
              fetch,
              log,
              connectorId: connector.id,
              corpus,
              kqlFilter: toKeywordFilter(input!.question),
            }),
        },
        [...retrievalEvaluators(corpus), countSanityEvaluator(auditTotalDocuments)]
      );
    });

    evaluate('semantic arm', async ({ executorClient, fetch, log, connector }) => {
      await assertSemanticSearchAvailable({ fetch, connectorId: connector.id, corpus, log });
      await executorClient.runExperiment(
        {
          name: 'retrieval-semantic',
          datasets: [datasetForArm(ARMS.semantic, corpus)],
          task: async ({ input }): Promise<RetrievalTaskOutput> =>
            executeGetLogsSemantic({
              fetch,
              log,
              connectorId: connector.id,
              corpus,
              semanticFilter: input!.question,
            }),
        },
        [...retrievalEvaluators(corpus), countSanityEvaluator(auditTotalDocuments)]
      );
    });
  }
);
