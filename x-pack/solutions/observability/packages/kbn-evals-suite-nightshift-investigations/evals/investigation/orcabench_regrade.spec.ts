/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@playwright/test';
import { buildModelFromConnector, tags } from '@kbn/evals';
import { evaluate } from '../../src/evaluate';
import { loadOrcaDataset, resolveOrcaRun, storeOrcaSlice } from './orca_dataset';
import { orcaJudgeConnector } from './orca_judge';
import { createOrcaEvaluators } from './orca/evaluators';
import { addOrcaReport } from './orca/report';
import { loadOrcaRubrics } from './orca/rubrics';
import {
  buildOrcaRegradeDataset,
  loadStoredOrcaRuns,
  needsOrcaReport,
  resolveOrcaRegradeExperiment,
} from './orca/regrade';
import { assertScoresWithinQueryLimit } from './score_budget';

const experimentId = resolveOrcaRegradeExperiment();
const run = resolveOrcaRun();

evaluate.describe(
  'Nightshift investigations: orcabench re-grade',
  { tag: [...tags.serverless.observability.complete] },
  () => {
    evaluate.describe.configure({ retries: 0 });
    evaluate(
      "re-grades a stored ORCA experiment with ORCA's graders, without new investigations",
      async ({
        evalsClient,
        executorClient,
        connector,
        inferenceClient,
        evaluationConnector,
        concurrency: requestedConcurrency,
        repetitions,
        log,
      }) => {
        // Each stored run is graded once; a repetition would grade a second report under the same
        // investigation id.
        expect(repetitions, 'ORCA re-grades each stored run once').toBe(1);
        const stored = await loadStoredOrcaRuns(evalsClient, experimentId);
        const missingReports = [...stored.outputs.values()].filter(needsOrcaReport).length;
        // A missing report.md is written by the model under test, so it must be the model that
        // ran the investigations.
        if (missingReports > 0) {
          expect(
            buildModelFromConnector(connector).id,
            `${missingReports} runs need a report.md; re-grade with the connector of the model that ran ${experimentId}`
          ).toBe(stored.taskModelId);
        }
        // The pinned release, not the experiment's dataset, so earlier releases get orca_expected.
        const release = await loadOrcaDataset(evalsClient, { release: run.release });
        const dataset = await storeOrcaSlice(
          evalsClient,
          buildOrcaRegradeDataset(release, stored.outputs, experimentId)
        );
        const judgeConnector = orcaJudgeConnector(evaluationConnector);
        const evaluators = createOrcaEvaluators(
          {
            inferenceClient: inferenceClient.bindTo({ connectorId: judgeConnector.id }),
            evaluationConnector: judgeConnector,
            log,
          },
          { rubrics: await loadOrcaRubrics(evalsClient) }
        );
        assertScoresWithinQueryLimit({
          examples: dataset.examples.length,
          repetitions: 1,
          evaluators: evaluators.length,
        });
        const reportDeps = {
          inferenceClient: inferenceClient.bindTo({ connectorId: connector.id }),
          log,
        };
        const concurrency = Math.min(8, requestedConcurrency);
        evaluate.setTimeout(Math.ceil(dataset.examples.length / concurrency) * 10 * 60_000);
        let reportsWritten = 0;

        const [experiment] = await executorClient.runExperiment(
          {
            name: 'Nightshift ORCA re-grade',
            datasets: [dataset],
            trustUpstreamDataset: false,
            concurrency,
            metadata: {
              regraded_experiment: experimentId,
              dataset_release: run.release.name,
              dataset_sha256: run.release.sha256,
            },
            task: async (example) => {
              const output = stored.outputs.get(example.metadata.case_id);
              if (!output) throw new Error(`No stored run for ${example.metadata.case_id}`);
              // A run graded before the report step existed gets its report.md now.
              if (!needsOrcaReport(output)) return output;
              const withReport = await addOrcaReport(reportDeps, { ...output });
              if (withReport.orca_report_md !== undefined) reportsWritten++;
              return withReport;
            },
          },
          evaluators
        );

        await expect
          .poll(async () => (await evalsClient.getExperimentScores(experiment.id)).length, {
            timeout: 60_000,
          })
          .toBe(dataset.examples.length * evaluators.length);
        log.info(
          `Re-graded ${dataset.examples.length} runs of ${experimentId} as ${experiment.id}; wrote ${reportsWritten} of ${missingReports} missing report.md`
        );
      }
    );
  }
);
