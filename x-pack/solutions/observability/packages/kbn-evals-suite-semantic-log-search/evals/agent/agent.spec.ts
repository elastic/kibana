/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { evaluate, tags } from '@kbn/evals';
import type { AgentBuilderClient, DefaultEvaluators, EvalsExecutorClient } from '@kbn/evals';
import { createArmAgent, deleteAgent } from '../../src/agent/agents';
import { agentEvaluators } from '../../src/agent/evaluators';
import type { AgentEvaluator } from '../../src/agent/evaluators';
import type { AgentTaskOutput } from '../../src/agent/types';
import { resolveCorpus } from '../../src/corpora';
import {
  assertCorpusIsLabelled,
  assertSemanticSearchAvailable,
  auditCorpus,
  logRunManifest,
  seedCorpusIfNeeded,
} from '../../src/corpus_audit';
import { datasetForArm } from '../../src/datasets';
import { ARMS } from '../../src/types';
import type { Arm } from '../../src/types';

/** Resolved once at module load; all tests in this file use the same corpus. */
const corpus = resolveCorpus();

// Phrased to hold for every question in the set, because the criteria evaluator is built once and
// reused across all of them; anything question-specific belongs in a `note` on the query instead.
const ANSWER_CRITERIA = [
  'The answer reports log messages that match the meaning of the question, including messages that share no words with it.',
  'The answer does not present healthy or purely informational log lines as evidence of a failure.',
  'The answer states which log messages it found rather than describing the search it performed.',
];

/**
 * The same questions asked through Agent Builder, which is where token cost, answer quality and
 * end-to-end latency become measurable.
 *
 * The baseline arm is the default agent, carrying the standard tool set and no log-specific tool,
 * so it measures what a user gets today rather than acting as a null result.
 */
evaluate.describe(
  'Semantic log search: agent',
  { tag: tags.serverless.observability.complete },
  () => {
    const agentIdsByArm = new Map<Arm, string>();

    evaluate.beforeAll(async ({ esClient, fetch, log, connector }) => {
      let audit = await auditCorpus({ esClient, corpus, log });
      if (seedCorpusIfNeeded(audit, corpus, log)) {
        audit = await auditCorpus({ esClient, corpus, log });
      }
      assertCorpusIsLabelled(audit, corpus);
      await logRunManifest({ esClient, corpus, audit, log });

      for (const arm of [ARMS.keyword, ARMS.semantic] as const) {
        agentIdsByArm.set(
          arm,
          await createArmAgent({ fetch, log, connectorId: connector.id, arm })
        );
      }
    });

    evaluate.afterAll(async ({ fetch, log }) => {
      for (const agentId of agentIdsByArm.values()) {
        await deleteAgent({ fetch, log, agentId });
      }
    });

    const runArm = async ({
      arm,
      executorClient,
      agentBuilderClient,
      evaluators,
    }: {
      arm: Arm;
      executorClient: EvalsExecutorClient;
      agentBuilderClient: AgentBuilderClient;
      evaluators: DefaultEvaluators;
    }): Promise<void> => {
      const agentId = arm === ARMS.baseline ? agentBuilderDefaultAgentId : agentIdsByArm.get(arm);

      if (!agentId) {
        throw new Error(`No agent was created for the "${arm}" arm`);
      }

      const { inputTokens, outputTokens, latency, toolCalls } = evaluators.traceBasedEvaluators;

      await executorClient.runExperiment(
        {
          name: `agent-${arm}`,
          datasets: [datasetForArm(arm, corpus)],
          task: async ({ input }): Promise<AgentTaskOutput> => {
            const response = await agentBuilderClient.converse({
              agentId,
              input: `${input!.question}. Search the logs in "${corpus.target}" between ${
                corpus.timeRange.start
              } and ${corpus.timeRange.end}.`,
            });

            return {
              answer: response.message,
              steps: response.steps,
              traceId: response.traceId,
            };
          },
        },
        [
          ...agentEvaluators(corpus),
          evaluators.criteria(ANSWER_CRITERIA),
          inputTokens,
          outputTokens,
          latency,
          toolCalls,
        ] as AgentEvaluator[]
      );
    };

    evaluate('baseline arm', async ({ executorClient, agentBuilderClient, evaluators }) => {
      await runArm({ arm: ARMS.baseline, executorClient, agentBuilderClient, evaluators });
    });

    evaluate('keyword arm', async ({ executorClient, agentBuilderClient, evaluators }) => {
      await runArm({ arm: ARMS.keyword, executorClient, agentBuilderClient, evaluators });
    });

    evaluate(
      'semantic arm',
      async ({ executorClient, agentBuilderClient, evaluators, fetch, connector, log }) => {
        await assertSemanticSearchAvailable({ fetch, connectorId: connector.id, corpus, log });
        await runArm({ arm: ARMS.semantic, executorClient, agentBuilderClient, evaluators });
      }
    );
  }
);
