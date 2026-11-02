/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@playwright/test';
import { selectEvaluators, tags } from '@kbn/evals';
import { NIGHTSHIFT_ASSISTANT_AGENT_ID } from '@kbn/nightshift-investigations-plugin/common';
import { evaluate } from '../../src/evaluate';
import { readConnectorProbeDataset } from './datasets';
import { createConnectorProbeEvaluators } from './evaluators';
import { runConnectorProbe } from './task';
import type { ConnectorProbeTaskOutput } from './types';

/**
 * Asks the Nightshift assistant each probe question in one `converse` call, so a case takes a few
 * model turns rather than a full investigation, and scores its connector use, its wall-clock time
 * and its behaviour against the example's reference answer.
 */
const suiteTags = [...tags.stateful.classic, ...tags.serverless.observability.complete];

evaluate.describe('Nightshift assistant: connector probes', { tag: suiteTags }, () => {
  evaluate(
    'answers telemetry probes through the Elasticsearch connector',
    async ({ executorClient, connector, fetch, evaluators, concurrency, repetitions, log }) => {
      const dataset = readConnectorProbeDataset();
      // The agent is installed in the background at Kibana start.
      await expect
        .poll(
          async () =>
            fetch(`/api/agent_builder/agents/${NIGHTSHIFT_ASSISTANT_AGENT_ID}`, {
              version: '2023-10-31',
            }).then(
              () => true,
              () => false
            ),
          { timeout: 60_000 }
        )
        .toBe(true);

      const [experiment] = await executorClient.runExperiment(
        {
          name: 'Nightshift assistant connector probes',
          datasets: [dataset],
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
          .map(({ name, result }) => [name, result?.score ?? null]);
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
