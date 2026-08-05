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
  EvaluationIndices,
  type GetEvaluationExperimentsResponse,
  type IngestScoresResponse,
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
      await es
        .deleteByQuery({
          index: EvaluationIndices.SCORES,
          query: { term: { experiment_id: experimentId } },
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
  });
}
