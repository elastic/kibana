/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate, tags } from '@kbn/evals';
import { resolveCorpus } from '../../src/corpora';
import { assertCorpusIsLabelled, auditCorpus } from '../../src/corpus_audit';
import { datasetForArm } from '../../src/datasets';
import { retrievalEvaluators } from '../../src/evaluators';
import { toKeywordFilter } from '../../src/keyword_filter';
import { executeGetLogs, executeGetLogsSemantic } from '../../src/tool_client';
import { ARMS } from '../../src/types';
import type { RetrievalTaskOutput } from '../../src/types';

/** Resolved once at module load; all tests in this file use the same corpus. */
const corpus = resolveCorpus();

/**
 * Retrieval quality, measured with no model in the loop.
 *
 * The keyword arm calls `observability.get_logs` and the semantic arm calls
 * `observability.get_logs_semantic`, both through the tool execution API, so
 * the ranking is deterministic and the only variable is which path is used.
 * Token cost and latency are not measured here; they belong to the agent
 * arms, where a model is actually running.
 */
evaluate.describe(
  'Semantic log search: retrieval',
  { tag: tags.serverless.observability.complete },
  () => {
    evaluate.beforeAll(async ({ esClient, log }) => {
      const audit = await auditCorpus({ esClient, corpus, log });
      assertCorpusIsLabelled(audit, corpus);
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
        retrievalEvaluators(corpus)
      );
    });

    evaluate('semantic arm', async ({ executorClient, fetch, log, connector }) => {
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
        retrievalEvaluators(corpus)
      );
    });
  }
);
