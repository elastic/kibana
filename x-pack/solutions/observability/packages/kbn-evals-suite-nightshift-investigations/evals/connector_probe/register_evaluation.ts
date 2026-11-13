/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@playwright/test';
import { selectEvaluators, tags } from '@kbn/evals';
import type { EvaluationDataset, EvalsClient } from '@kbn/evals';
import {
  NIGHTSHIFT_ASSISTANT_AGENT_ID,
  NIGHTSHIFT_INVESTIGATION_AGENT_ID,
} from '@kbn/nightshift-investigations-plugin/common';
import { evaluate } from '../../src/evaluate';
import { saveConnectorSetOnInvestigator } from '../investigation/connector_sets';
import { enableNightshiftSpace } from '../investigation/space_setup';
import { createConnectorProbeEvaluators } from './evaluators';
import { runConnectorProbe } from './task';
import type { ConnectorProbeExample, ConnectorProbeTaskOutput } from './types';

const suiteTags = [...tags.stateful.classic, ...tags.serverless.observability.complete];

// Sizes the test timeout only; a single `converse` call is not cut off at this budget.
const PROBE_BUDGET_MS = 5 * 60_000;

/**
 * Asks the Nightshift assistant each probe question in one `converse` call, so a case takes a few
 * model turns rather than a full investigation, and scores its connector use, its wall-clock time
 * and its behaviour against the example's reference answer.
 */
export const registerConnectorProbeEvaluation = ({
  name,
  loadDataset,
  trustUpstreamDataset = false,
  // Experiment ids come from the build, suite, model and this name, so datasets that can run in one
  // build need distinct names or their scores merge.
  experimentName = 'Nightshift assistant connector probes',
}: {
  name: string;
  loadDataset: (
    client: Pick<EvalsClient, 'getDatasetByName'>
  ) => Promise<EvaluationDataset<ConnectorProbeExample>>;
  trustUpstreamDataset?: boolean;
  experimentName?: string;
}): void => {
  evaluate.describe(`Nightshift assistant: ${name}`, { tag: suiteTags }, () => {
    // Scout retries a failed test once on CI; a probe dataset must not run and score twice.
    evaluate.describe.configure({ retries: 0 });
    evaluate(
      'answers telemetry probes through the Elasticsearch connector',
      async ({
        config,
        esClient,
        kbnUrl,
        samlAuth,
        executorClient,
        evalsClient,
        connector,
        fetch,
        evaluators,
        concurrency,
        repetitions,
        log,
      }) => {
        const dataset = await loadDataset(evalsClient);
        evaluate.setTimeout(
          Math.ceil((dataset.examples.length * repetitions) / concurrency) * PROBE_BUDGET_MS +
            5 * 60_000
        );
        // Agent Builder reports both agents unavailable until the space is bound to the Nightshift
        // service accounts, and this shard can run on its own fresh stack.
        await enableNightshiftSpace({
          config,
          esClient,
          kbnUrl,
          samlAuth,
          fetch,
          log,
          connectorId: connector.id,
        });
        await expect
          .poll(
            async () =>
              Promise.all(
                [NIGHTSHIFT_ASSISTANT_AGENT_ID, NIGHTSHIFT_INVESTIGATION_AGENT_ID].map((agentId) =>
                  fetch(`/api/agent_builder/agents/${agentId}`, { version: '2023-10-31' })
                )
              ).then(
                () => true,
                () => false
              ),
            { timeout: 60_000 }
          )
          .toBe(true);
        // The assistant uses the connectors saved on the investigator.
        await saveConnectorSetOnInvestigator(fetch);

        const [experiment] = await executorClient.runExperiment(
          {
            name: experimentName,
            datasets: [dataset],
            trustUpstreamDataset,
            concurrency,
            metadata: { concurrency, agent_id: NIGHTSHIFT_ASSISTANT_AGENT_ID },
            task: (example) => runConnectorProbe(fetch, example, connector),
          },
          selectEvaluators(createConnectorProbeEvaluators(evaluators))
        );

        const runs = Object.values(experiment.runs);
        expect(runs).toHaveLength(dataset.examples.length * repetitions);

        for (const [runId, run] of Object.entries(experiment.runs)) {
          const output = run.output as ConnectorProbeTaskOutput;
          const scores = experiment.evaluationRuns
            .filter(({ experimentRunId }) => experimentRunId === runId)
            .map(({ name: evaluatorName, result }) => [evaluatorName, result?.score ?? null]);
          log.info(
            JSON.stringify({
              case_id: output.case_id,
              duration_s: Math.round(output.duration_ms / 100) / 10,
              tool_calls: output.tool_call_trajectory.length,
              conversation_id: output.conversation_id,
              trace_id: output.traceId,
              execution_error: output.execution_error,
              scores: Object.fromEntries(scores),
            })
          );
        }

        // Scores grade the answers; a failed converse call means the run itself is broken.
        expect(
          runs
            .map(({ output }) => output as ConnectorProbeTaskOutput)
            .filter(({ execution_error: executionError }) => executionError)
            .map(({ case_id: caseId, execution_error: executionError }) => ({
              caseId,
              executionError,
            }))
        ).toEqual([]);
      }
    );
  });
};
