/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  EVALS_SCORES_URL,
  EVALS_EXPERIMENTS_URL,
  EVALS_EXPERIMENT_URL,
  EVALS_EXPERIMENT_SCORES_URL,
  EVALS_EXPERIMENT_DATASET_EXAMPLES_URL,
  EVALS_EXPERIMENTS_COMPARE_URL,
  EVALS_EXAMPLE_SCORES_URL,
  EvaluationIndices,
  type CompareExperimentsResponse,
  type GetEvaluationExperimentResponse,
  type GetEvaluationExperimentScoresResponse,
  type GetEvaluationExperimentDatasetExamplesResponse,
  type GetEvaluationExperimentsResponse,
  type GetExampleScoresResponse,
} from '@kbn/evals-common';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { SupertestWithRoleScopeType } from '../../services';
import { getEvalsApiClientForRole } from './helpers/api_client';
import { buildScore, buildScoresRequestBody, uniqueSuffix } from './helpers/fixtures';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const es = getService('es');

  let adminClient: SupertestWithRoleScopeType;
  let viewerClient: SupertestWithRoleScopeType;

  describe('Evals - Experiments', function () {
    const suiteId = `ftr-experiments-${uniqueSuffix()}`;
    const baselineExperimentId = `experiment-baseline-${suiteId}`;
    const targetExperimentId = `experiment-target-${suiteId}`;
    const datasetId = `dataset-${suiteId}`;
    const datasetName = `Dataset ${suiteId}`;
    const evaluatorName = 'correctness';
    const exampleIds = ['example-1', 'example-2', 'example-3'];

    const experimentPath = (experimentId: string) =>
      EVALS_EXPERIMENT_URL.replace('{experimentId}', encodeURIComponent(experimentId));

    const ingest = async (experimentId: string, scoresByExample: number[]) => {
      const body = buildScoresRequestBody({
        experimentId,
        suiteId,
        scores: exampleIds.map((exampleId, index) =>
          buildScore({
            exampleId,
            exampleIndex: index,
            datasetId,
            datasetName,
            evaluatorName,
            score: scoresByExample[index],
          })
        ),
      });
      await adminClient.post(EVALS_SCORES_URL).send(body).expect(200);
    };

    before(async () => {
      adminClient = await getEvalsApiClientForRole(roleScopedSupertest, 'admin');
      viewerClient = await getEvalsApiClientForRole(roleScopedSupertest, 'viewer');
      await ingest(baselineExperimentId, [1, 0.5, 0]);
      await ingest(targetExperimentId, [0.8, 0.6, 0.4]);
    });

    after(async () => {
      await adminClient.destroy();
      await viewerClient.destroy();
      await es
        .deleteByQuery({
          index: EvaluationIndices.SCORES,
          query: { term: { 'metadata.suite_id': suiteId } },
          refresh: true,
          conflicts: 'proceed',
          ignore_unavailable: true,
        })
        .catch(() => {
          // best-effort cleanup
        });
    });

    describe('listing', () => {
      it('lists the experiments belonging to a suite', async () => {
        const { body } = await adminClient
          .get(EVALS_EXPERIMENTS_URL)
          .query({ suite_id: suiteId })
          .expect(200);

        const listing = body as GetEvaluationExperimentsResponse;
        expect(listing.total).to.eql(2);
        const ids = listing.experiments.map((experiment) => experiment.experiment_id).sort();
        expect(ids).to.eql([baselineExperimentId, targetExperimentId].sort());
      });

      it('honours pagination parameters', async () => {
        const { body } = await adminClient
          .get(EVALS_EXPERIMENTS_URL)
          .query({ suite_id: suiteId, page: 1, per_page: 1 })
          .expect(200);

        const listing = body as GetEvaluationExperimentsResponse;
        expect(listing.total).to.eql(2);
        expect(listing.experiments.length).to.eql(1);
      });

      it('allows listing experiments with read_evals (viewer)', async () => {
        const { body } = await viewerClient
          .get(EVALS_EXPERIMENTS_URL)
          .query({ suite_id: suiteId })
          .expect(200);

        expect((body as GetEvaluationExperimentsResponse).total).to.eql(2);
      });
    });

    describe('detail', () => {
      it('returns experiment metadata with per-evaluator stats', async () => {
        const { body } = await adminClient.get(experimentPath(baselineExperimentId)).expect(200);

        const detail = body as GetEvaluationExperimentResponse;
        expect(detail.experiment_id).to.eql(baselineExperimentId);
        expect(detail.suite_id).to.eql(suiteId);
        expect(detail.task_model).to.not.be(undefined);

        const evaluatorStats = detail.stats.find(
          (stat) => stat.evaluator_name === evaluatorName && stat.dataset_id === datasetId
        );
        expect(evaluatorStats).to.not.be(undefined);
        expect(evaluatorStats?.stats.count).to.eql(3);
        expect(evaluatorStats?.stats.min).to.eql(0);
        expect(evaluatorStats?.stats.max).to.eql(1);
      });

      it('returns 404 for an unknown experiment', async () => {
        await adminClient.get(experimentPath(`missing-${suiteId}`)).expect(404);
      });
    });

    describe('scores', () => {
      it('returns every score document for an experiment', async () => {
        const path = EVALS_EXPERIMENT_SCORES_URL.replace(
          '{experimentId}',
          encodeURIComponent(baselineExperimentId)
        );
        const { body } = await adminClient.get(path).expect(200);

        const scoresResponse = body as GetEvaluationExperimentScoresResponse;
        expect(scoresResponse.total).to.eql(3);
        expect(
          scoresResponse.scores.every((score) => score.experiment_id === baselineExperimentId)
        ).to.be(true);
      });
    });

    describe('dataset examples', () => {
      it('groups an experiment scores by example for a dataset', async () => {
        const path = EVALS_EXPERIMENT_DATASET_EXAMPLES_URL.replace(
          '{experimentId}',
          encodeURIComponent(baselineExperimentId)
        ).replace('{datasetId}', encodeURIComponent(datasetId));

        const { body } = await adminClient.get(path).expect(200);

        const examplesResponse = body as GetEvaluationExperimentDatasetExamplesResponse;
        expect(examplesResponse.examples.length).to.eql(3);
        expect(examplesResponse.examples.map((example) => example.example_id).sort()).to.eql(
          [...exampleIds].sort()
        );
        expect(examplesResponse.examples.every((example) => example.scores.length >= 1)).to.be(
          true
        );
      });
    });

    describe('compare', () => {
      it('runs a paired comparison over the shared dataset examples', async () => {
        const { body } = await adminClient
          .get(EVALS_EXPERIMENTS_COMPARE_URL)
          .query({
            type: 'experiment',
            baseline_id: baselineExperimentId,
            target_id: targetExperimentId,
          })
          .expect(200);

        const comparison = body as CompareExperimentsResponse;
        expect(comparison.pairing.totalPairs).to.eql(3);
        expect(comparison.results.length).to.be.greaterThan(0);

        const evaluatorResult = comparison.results.find(
          (result) => result.datasetId === datasetId && result.evaluatorName === evaluatorName
        );
        expect(evaluatorResult).to.not.be(undefined);
        expect(evaluatorResult?.sampleSize).to.eql(3);
      });

      it('returns 404 when a compared experiment has no scores', async () => {
        await adminClient
          .get(EVALS_EXPERIMENTS_COMPARE_URL)
          .query({
            type: 'experiment',
            baseline_id: baselineExperimentId,
            target_id: `missing-${suiteId}`,
          })
          .expect(404);
      });
    });

    describe('example scores', () => {
      it('returns the score history for a seeded example id', async () => {
        const path = EVALS_EXAMPLE_SCORES_URL.replace(
          '{exampleId}',
          encodeURIComponent(exampleIds[0])
        );
        const { body } = await adminClient.get(path).expect(200);

        const response = body as GetExampleScoresResponse;
        expect(response.total).to.be.greaterThan(0);
        const experimentIds = response.scores.map((score) => score.experiment_id);
        expect(experimentIds).to.contain(baselineExperimentId);
        expect(experimentIds).to.contain(targetExperimentId);
      });
    });
  });
}
