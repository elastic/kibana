/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  EVALS_DATASETS_URL,
  EVALS_DATASET_URL,
  EVALS_DATASET_EXAMPLES_URL,
  EVALS_DATASET_EXAMPLE_URL,
  EVALS_DATASET_UPSERT_URL,
  type AddEvaluationDatasetExamplesResponse,
  type CreateEvaluationDatasetResponse,
  type DeleteEvaluationDatasetExampleResponse,
  type DeleteEvaluationDatasetResponse,
  type GetEvaluationDatasetResponse,
  type GetEvaluationDatasetsResponse,
  type UpdateEvaluationDatasetExampleResponse,
  type UpdateEvaluationDatasetResponse,
  type UpsertEvaluationDatasetResponse,
} from '@kbn/evals-common';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { SupertestWithRoleScopeType } from '../../services';
import { getEvalsApiClientForRole } from './helpers/api_client';
import { uniqueSuffix } from './helpers/fixtures';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');

  let adminClient: SupertestWithRoleScopeType;
  let viewerClient: SupertestWithRoleScopeType;

  const datasetPath = (datasetId: string) =>
    EVALS_DATASET_URL.replace('{datasetId}', encodeURIComponent(datasetId));
  const examplesPath = (datasetId: string) =>
    EVALS_DATASET_EXAMPLES_URL.replace('{datasetId}', encodeURIComponent(datasetId));
  const examplePath = (datasetId: string, exampleId: string) =>
    EVALS_DATASET_EXAMPLE_URL.replace('{datasetId}', encodeURIComponent(datasetId)).replace(
      '{exampleId}',
      encodeURIComponent(exampleId)
    );

  describe('Evals - Datasets', function () {
    const suffix = uniqueSuffix();

    before(async () => {
      adminClient = await getEvalsApiClientForRole(roleScopedSupertest, 'admin');
      viewerClient = await getEvalsApiClientForRole(roleScopedSupertest, 'viewer');
    });

    after(async () => {
      await adminClient.destroy();
      await viewerClient.destroy();
    });

    describe('CRUD', () => {
      const datasetName = `FTR Dataset ${suffix}`;
      let datasetId = '';

      after(async () => {
        if (datasetId) {
          await adminClient.delete(datasetPath(datasetId)).catch(() => {
            // best-effort cleanup
          });
        }
      });

      it('creates a dataset with manage_evals privileges', async () => {
        const { body } = await adminClient
          .post(EVALS_DATASETS_URL)
          .send({ name: datasetName, description: 'initial description' })
          .expect(200);

        const created = body as CreateEvaluationDatasetResponse;
        expect(created.name).to.eql(datasetName);
        expect(typeof created.dataset_id).to.eql('string');
        datasetId = created.dataset_id;
      });

      it('rejects dataset creation without manage_evals privileges (viewer)', async () => {
        await viewerClient
          .post(EVALS_DATASETS_URL)
          .send({ name: `viewer-${suffix}`, description: 'should be rejected' })
          .expect(403);
      });

      it('returns 409 when creating a dataset with a duplicate name', async () => {
        await adminClient
          .post(EVALS_DATASETS_URL)
          .send({ name: datasetName, description: 'duplicate' })
          .expect(409);
      });

      it('gets a dataset by id', async () => {
        const { body } = await adminClient.get(datasetPath(datasetId)).expect(200);

        const dataset = body as GetEvaluationDatasetResponse;
        expect(dataset.id).to.eql(datasetId);
        expect(dataset.name).to.eql(datasetName);
        expect(dataset.description).to.eql('initial description');
        expect(dataset.examples).to.eql([]);
      });

      it('returns 404 for an unknown dataset', async () => {
        await adminClient.get(datasetPath(`missing-${suffix}`)).expect(404);
      });

      it('updates a dataset description', async () => {
        const { body } = await adminClient
          .put(datasetPath(datasetId))
          .send({ description: 'updated description' })
          .expect(200);

        const updated = body as UpdateEvaluationDatasetResponse;
        expect(updated.name).to.eql(datasetName);
        expect(updated.description).to.eql('updated description');
      });

      it('lists datasets and includes the created dataset', async () => {
        const { body } = await adminClient
          .get(EVALS_DATASETS_URL)
          .query({ search: datasetName })
          .expect(200);

        const listing = body as GetEvaluationDatasetsResponse;
        const found = listing.datasets.find((dataset) => dataset.id === datasetId);
        expect(found).to.not.be(undefined);
        expect(found?.description).to.eql('updated description');
      });

      it('allows listing datasets with read_evals (viewer)', async () => {
        const { body } = await viewerClient
          .get(EVALS_DATASETS_URL)
          .query({ search: datasetName })
          .expect(200);

        const listing = body as GetEvaluationDatasetsResponse;
        expect(listing.datasets.some((dataset) => dataset.id === datasetId)).to.be(true);
      });

      it('allows reading a dataset by id with read_evals (viewer)', async () => {
        const { body } = await viewerClient.get(datasetPath(datasetId)).expect(200);
        expect((body as GetEvaluationDatasetResponse).id).to.eql(datasetId);
      });

      it('rejects deleting a dataset without manage_evals privileges (viewer)', async () => {
        await viewerClient.delete(datasetPath(datasetId)).expect(403);
      });

      it('deletes a dataset', async () => {
        const { body } = await adminClient.delete(datasetPath(datasetId)).expect(200);
        expect((body as DeleteEvaluationDatasetResponse).success).to.be(true);

        await adminClient.get(datasetPath(datasetId)).expect(404);
        datasetId = '';
      });
    });

    describe('examples', () => {
      const exampleDatasetName = `FTR Examples Dataset ${suffix}`;
      let exampleDatasetId = '';
      let exampleId = '';
      let updatedExampleId = '';

      before(async () => {
        const { body: createdBody } = await adminClient
          .post(EVALS_DATASETS_URL)
          .send({ name: exampleDatasetName, description: 'examples fixture' })
          .expect(200);
        exampleDatasetId = (createdBody as CreateEvaluationDatasetResponse).dataset_id;

        const { body: addBody } = await adminClient
          .post(examplesPath(exampleDatasetId))
          .send({
            examples: [
              { input: { question: 'a' }, output: { answer: '1' } },
              { input: { question: 'b' }, output: { answer: '2' } },
            ],
          })
          .expect(200);
        expect((addBody as AddEvaluationDatasetExamplesResponse).added).to.eql(2);

        const { body: datasetBody } = await adminClient
          .get(datasetPath(exampleDatasetId))
          .expect(200);
        exampleId = (datasetBody as GetEvaluationDatasetResponse).examples[0].id;
      });

      after(async () => {
        if (exampleDatasetId) {
          await adminClient.delete(datasetPath(exampleDatasetId)).catch(() => {
            // best-effort cleanup
          });
        }
      });

      it('exposes the added examples', async () => {
        const { body } = await adminClient.get(datasetPath(exampleDatasetId)).expect(200);
        const dataset = body as GetEvaluationDatasetResponse;
        expect(dataset.examples.length).to.eql(2);
        expect(dataset.examples.map((example) => example.id)).to.contain(exampleId);
      });

      it('rejects adding examples without manage_evals privileges (viewer)', async () => {
        await viewerClient
          .post(examplesPath(exampleDatasetId))
          .send({ examples: [{ input: { question: 'c' } }] })
          .expect(403);
      });

      it('updates a dataset example', async () => {
        const { body } = await adminClient
          .put(examplePath(exampleDatasetId, exampleId))
          .send({ input: { question: 'a-updated' }, output: { answer: '1-updated' } })
          .expect(200);

        const updated = body as UpdateEvaluationDatasetExampleResponse;
        expect(updated.dataset_id).to.eql(exampleDatasetId);
        expect(updated.input).to.eql({ question: 'a-updated' });
        // example id is a content hash, so an update yields a new id
        updatedExampleId = updated.id;
      });

      it('deletes a dataset example', async () => {
        const { body } = await adminClient
          .delete(examplePath(exampleDatasetId, updatedExampleId))
          .expect(200);
        expect((body as DeleteEvaluationDatasetExampleResponse).success).to.be(true);

        const { body: datasetBody } = await adminClient
          .get(datasetPath(exampleDatasetId))
          .expect(200);
        expect((datasetBody as GetEvaluationDatasetResponse).examples.length).to.eql(1);
      });
    });

    describe('bulk upsert', () => {
      const upsertName = `FTR Upsert Dataset ${suffix}`;
      let upsertDatasetId = '';

      after(async () => {
        if (upsertDatasetId) {
          await adminClient.delete(datasetPath(upsertDatasetId)).catch(() => {
            // best-effort cleanup
          });
        }
      });

      it('creates a dataset with examples on the first upsert', async () => {
        const { body } = await adminClient
          .post(EVALS_DATASET_UPSERT_URL)
          .send({
            name: upsertName,
            description: 'via upsert',
            examples: [{ input: { question: '1' } }, { input: { question: '2' } }],
          })
          .expect(200);

        const result = body as UpsertEvaluationDatasetResponse;
        expect(typeof result.dataset_id).to.eql('string');
        expect(result.added).to.eql(2);
        expect(result.removed).to.eql(0);
        upsertDatasetId = result.dataset_id;
      });

      it('reconciles examples (add/remove/unchanged) on a subsequent upsert', async () => {
        const { body } = await adminClient
          .post(EVALS_DATASET_UPSERT_URL)
          .send({
            name: upsertName,
            description: 'via upsert',
            examples: [{ input: { question: '1' } }, { input: { question: '3' } }],
          })
          .expect(200);

        const result = body as UpsertEvaluationDatasetResponse;
        expect(result.dataset_id).to.eql(upsertDatasetId);
        expect(result.added).to.eql(1);
        expect(result.removed).to.eql(1);
        expect(result.unchanged).to.eql(1);
      });

      it('rejects upsert without manage_evals privileges (viewer)', async () => {
        await viewerClient
          .post(EVALS_DATASET_UPSERT_URL)
          .send({
            name: `viewer-upsert-${suffix}`,
            description: 'should be rejected',
            examples: [],
          })
          .expect(403);
      });
    });
  });
}
