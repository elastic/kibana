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
  EvaluationIndices,
  type GetEvaluationExperimentResponse,
  type GetEvaluationExperimentScoresResponse,
  type GetEvaluationExperimentsResponse,
  type IngestScoresResponse,
} from '@kbn/evals-common';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { SupertestWithRoleScopeType } from '../../services';
import { getEvalsApiClientForRole } from './helpers/api_client';
import { buildScore, buildScoresRequestBody, uniqueSuffix } from './helpers/fixtures';

type StoredEvaluator = GetEvaluationExperimentScoresResponse['scores'][number]['evaluator'];

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const es = getService('es');

  let adminClient: SupertestWithRoleScopeType;
  let viewerClient: SupertestWithRoleScopeType;

  describe('Evals - Scores ingestion', function () {
    const suiteId = `ftr-scores-${uniqueSuffix()}`;
    const experimentId = `experiment-${suiteId}`;
    const datasetId = `dataset-${suiteId}`;
    const datasetName = `Dataset ${suiteId}`;

    before(async () => {
      adminClient = await getEvalsApiClientForRole(roleScopedSupertest, 'admin');
      viewerClient = await getEvalsApiClientForRole(roleScopedSupertest, 'viewer');
    });

    after(async () => {
      await adminClient.destroy();
      await viewerClient.destroy();
      // Scoped to the suite rather than a single experiment id, since this suite ingests
      // more than one experiment and every request here sets the same unique suite id.
      // Experiments launched in-tool carry no suite id, so they never match.
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

    it('ingests scores with manage_evals privileges', async () => {
      const body = buildScoresRequestBody({
        experimentId,
        suiteId,
        scores: [
          buildScore({ exampleId: 'example-1', exampleIndex: 0, datasetId, datasetName, score: 1 }),
          buildScore({ exampleId: 'example-2', exampleIndex: 1, datasetId, datasetName, score: 0 }),
        ],
      });

      const { body: result } = await adminClient.post(EVALS_SCORES_URL).send(body).expect(200);

      const ingestResult = result as IngestScoresResponse;
      expect(ingestResult.ingested).to.eql(2);
      expect(ingestResult.conflicted).to.eql(0);
      expect(ingestResult.failed).to.eql([]);
    });

    it('is idempotent: re-ingesting identical scores reports conflicts, not failures', async () => {
      const body = buildScoresRequestBody({
        experimentId,
        suiteId,
        scores: [
          buildScore({ exampleId: 'example-1', exampleIndex: 0, datasetId, datasetName, score: 1 }),
          buildScore({ exampleId: 'example-2', exampleIndex: 1, datasetId, datasetName, score: 0 }),
        ],
      });

      const { body: result } = await adminClient.post(EVALS_SCORES_URL).send(body).expect(200);

      const ingestResult = result as IngestScoresResponse;
      expect(ingestResult.ingested).to.eql(0);
      expect(ingestResult.conflicted).to.eql(2);
      expect(ingestResult.failed).to.eql([]);
    });

    it('rejects score ingestion without manage_evals privileges (viewer)', async () => {
      const body = buildScoresRequestBody({
        experimentId: `${experimentId}-forbidden`,
        suiteId,
        scores: [
          buildScore({ exampleId: 'example-1', exampleIndex: 0, datasetId, datasetName, score: 1 }),
        ],
      });

      await viewerClient.post(EVALS_SCORES_URL).send(body).expect(403);
    });

    it('surfaces the ingested experiment in the experiments listing (end-to-end)', async () => {
      const { body } = await adminClient
        .get(EVALS_EXPERIMENTS_URL)
        .query({ suite_id: suiteId })
        .expect(200);

      const listing = body as GetEvaluationExperimentsResponse;
      expect(listing.total).to.be.greaterThan(0);

      const experiment = listing.experiments.find((e) => e.experiment_id === experimentId);
      expect(experiment).to.not.be(undefined);
      expect(experiment?.suite_id).to.eql(suiteId);
      expect(experiment?.dataset_ids).to.contain(datasetId);
    });

    describe('per-score evaluator model attribution', () => {
      const judgeExperimentId = `experiment-judges-${suiteId}`;
      const perScoreModel = { id: 'judge-a', family: 'gpt-4', provider: 'openai' };

      before(async () => {
        const body = buildScoresRequestBody({
          experimentId: judgeExperimentId,
          suiteId,
          scores: [
            buildScore({
              exampleId: 'example-1',
              exampleIndex: 0,
              datasetId,
              datasetName,
              evaluatorName: 'correctness.factuality',
              evaluatorVersion: '1.2.0',
              evaluatorKind: 'llm',
              evaluatorModel: perScoreModel,
            }),
            buildScore({
              exampleId: 'example-1',
              exampleIndex: 0,
              datasetId,
              datasetName,
              evaluatorName: 'latency',
              evaluatorKind: 'code',
              score: 4.19,
            }),
            buildScore({
              exampleId: 'example-1',
              exampleIndex: 0,
              datasetId,
              datasetName,
              evaluatorName: 'groundedness',
            }),
          ],
        });

        await adminClient.post(EVALS_SCORES_URL).send(body).expect(200);
      });

      const getStoredEvaluators = async (): Promise<Map<string, StoredEvaluator>> => {
        const path = EVALS_EXPERIMENT_SCORES_URL.replace(
          '{experimentId}',
          encodeURIComponent(judgeExperimentId)
        );
        const { body } = await adminClient.get(path).expect(200);

        const { scores } = body as GetEvaluationExperimentScoresResponse;
        return new Map(scores.map((score) => [score.evaluator.name, score.evaluator]));
      };

      it('stores the model sent with a score rather than the request-level model', async () => {
        const evaluators = await getStoredEvaluators();

        expect(evaluators.get('correctness.factuality')?.model?.id).to.eql('judge-a');
        expect(evaluators.get('correctness.factuality')?.kind).to.eql('llm');
      });

      it('stores and returns the evaluator version', async () => {
        const evaluators = await getStoredEvaluators();

        expect(evaluators.get('correctness.factuality')?.version).to.eql('1.2.0');
      });

      it('leaves code evaluators unattributed instead of applying the request-level model', async () => {
        const evaluators = await getStoredEvaluators();

        expect(evaluators.get('latency')?.model).to.be(undefined);
        expect(evaluators.get('latency')?.kind).to.eql('code');
      });

      it('falls back to the request-level model for a score that sends none', async () => {
        const evaluators = await getStoredEvaluators();

        expect(evaluators.get('groundedness')?.model?.id).to.eql('gpt-4o');
      });

      it('reports the judge model per evaluator in the experiment stats', async () => {
        const path = EVALS_EXPERIMENT_URL.replace(
          '{experimentId}',
          encodeURIComponent(judgeExperimentId)
        );
        const { body } = await adminClient.get(path).expect(200);

        const { stats, evaluator_models: evaluatorModels } =
          body as GetEvaluationExperimentResponse;
        const modelByEvaluator = new Map(
          stats.map((stat) => [stat.evaluator_name, stat.evaluator_model?.id])
        );

        expect(modelByEvaluator.get('correctness.factuality')).to.eql('judge-a');
        expect(modelByEvaluator.get('groundedness')).to.eql('gpt-4o');
        expect(modelByEvaluator.get('latency')).to.be(undefined);
        // The same set the experiment summarizes, so the compare header can report that the
        // evaluators judged with different models instead of naming one of them.
        expect((evaluatorModels ?? []).map(({ id }) => id).sort()).to.eql(['gpt-4o', 'judge-a']);
      });

      it('exposes every distinct judge model on the experiments listing', async () => {
        const { body } = await adminClient
          .get(EVALS_EXPERIMENTS_URL)
          .query({ suite_id: suiteId })
          .expect(200);

        const listing = body as GetEvaluationExperimentsResponse;
        const experiment = listing.experiments.find(
          (candidate) => candidate.experiment_id === judgeExperimentId
        );

        expect((experiment?.evaluator_models ?? []).map(({ id }) => id).sort()).to.eql([
          'gpt-4o',
          'judge-a',
        ]);
      });
    });
  });
}
