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
  EVALS_DATASET_RESOLVE_URL,
  EVALS_DATASET_UPSERT_URL,
  type AddEvaluationDatasetExamplesResponse,
  type CreateEvaluationDatasetResponse,
  type DeleteEvaluationDatasetExampleResponse,
  type DeleteEvaluationDatasetResponse,
  type GetEvaluationDatasetResponse,
  type GetEvaluationDatasetsResponse,
  type ResolveEvaluationDatasetResponse,
  type UpdateEvaluationDatasetExampleResponse,
  type UpdateEvaluationDatasetResponse,
  type UpsertEvaluationDatasetResponse,
} from '@kbn/evals-common';
import { ALL_SPACES_ID, UNKNOWN_SPACE } from '@kbn/spaces-plugin/common/constants';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { SupertestWithRoleScopeType } from '../../services';
import { getEvalsApiClientForCustomRole, getEvalsApiClientForRole } from './helpers/api_client';
import { uniqueSuffix } from './helpers/fixtures';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const customRoleScopedSupertest = getService('customRoleScopedSupertest');
  const samlAuth = getService('samlAuth');
  const spaces = getService('spaces');

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

    describe('spaces', () => {
      const spaceId = `evals-space-${suffix}`;
      const inSpace = (path: string) => `/s/${spaceId}${path}`;
      const sharedName = `FTR Shared Dataset ${suffix}`;
      const createdDatasetIds: Array<{ id: string; path: (id: string) => string }> = [];

      before(async () => {
        await spaces.create({ id: spaceId, name: 'Evals Space', disabledFeatures: [] });
      });

      after(async () => {
        for (const { id, path } of createdDatasetIds) {
          await adminClient.delete(path(id)).catch(() => {
            // best-effort cleanup
          });
        }
        await spaces.delete(spaceId);
      });

      it('keeps a dataset created in one space out of another', async () => {
        const name = `FTR Space Scoped ${suffix}`;
        const { body } = await adminClient
          .post(inSpace(EVALS_DATASETS_URL))
          .send({ name, description: 'lives in one space' })
          .expect(200);

        const { dataset_id: datasetId } = body as CreateEvaluationDatasetResponse;
        createdDatasetIds.push({ id: datasetId, path: (id) => inSpace(datasetPath(id)) });

        await adminClient.get(inSpace(datasetPath(datasetId))).expect(200);
        await adminClient.get(datasetPath(datasetId)).expect(404);

        const { body: defaultListing } = await adminClient
          .get(EVALS_DATASETS_URL)
          .query({ search: name })
          .expect(200);
        expect((defaultListing as GetEvaluationDatasetsResponse).datasets).to.eql([]);
      });

      it('allows the same dataset name in two spaces', async () => {
        const { body: defaultBody } = await adminClient
          .post(EVALS_DATASETS_URL)
          .send({ name: sharedName, description: 'default space copy' })
          .expect(200);
        const defaultId = (defaultBody as CreateEvaluationDatasetResponse).dataset_id;
        createdDatasetIds.push({ id: defaultId, path: datasetPath });

        const { body: spaceBody } = await adminClient
          .post(inSpace(EVALS_DATASETS_URL))
          .send({ name: sharedName, description: 'other space copy' })
          .expect(200);
        const spaceScopedId = (spaceBody as CreateEvaluationDatasetResponse).dataset_id;
        createdDatasetIds.push({ id: spaceScopedId, path: (id) => inSpace(datasetPath(id)) });

        expect(spaceScopedId).to.not.eql(defaultId);
      });

      it('resolves a name to the id of the space it is asked from', async () => {
        const { body: defaultResolved } = await adminClient
          .get(EVALS_DATASET_RESOLVE_URL)
          .query({ name: sharedName })
          .expect(200);
        const { body: spaceResolved } = await adminClient
          .get(inSpace(EVALS_DATASET_RESOLVE_URL))
          .query({ name: sharedName })
          .expect(200);

        const defaultId = (defaultResolved as ResolveEvaluationDatasetResponse).id;
        const spaceScopedId = (spaceResolved as ResolveEvaluationDatasetResponse).id;
        expect(defaultId).to.not.eql(spaceScopedId);
        expect((defaultResolved as ResolveEvaluationDatasetResponse).description).to.eql(
          'default space copy'
        );
        expect((spaceResolved as ResolveEvaluationDatasetResponse).description).to.eql(
          'other space copy'
        );
      });

      it('shares a dataset across spaces when asked, and reports where it lives', async () => {
        const name = `FTR Multi Space ${suffix}`;
        const { body } = await adminClient
          .post(EVALS_DATASETS_URL)
          .send({ name, description: 'shared', space_ids: ['default', spaceId] })
          .expect(200);

        const { dataset_id: datasetId } = body as CreateEvaluationDatasetResponse;
        createdDatasetIds.push({ id: datasetId, path: datasetPath });

        const { body: fromDefault } = await adminClient.get(datasetPath(datasetId)).expect(200);
        const { body: fromSpace } = await adminClient
          .get(inSpace(datasetPath(datasetId)))
          .expect(200);

        expect((fromDefault as GetEvaluationDatasetResponse).space_ids?.sort()).to.eql(
          ['default', spaceId].sort()
        );
        expect((fromSpace as GetEvaluationDatasetResponse).id).to.eql(datasetId);
      });

      it('unshares instead of deleting a dataset another space still uses', async () => {
        const name = `FTR Unshare ${suffix}`;
        const { body } = await adminClient
          .post(EVALS_DATASETS_URL)
          .send({ name, description: 'shared', space_ids: ['default', spaceId] })
          .expect(200);

        const { dataset_id: datasetId } = body as CreateEvaluationDatasetResponse;

        const { body: deleted } = await adminClient
          .delete(inSpace(datasetPath(datasetId)))
          .expect(200);
        expect((deleted as DeleteEvaluationDatasetResponse).unshared).to.be(true);

        await adminClient.get(inSpace(datasetPath(datasetId))).expect(404);
        await adminClient.get(datasetPath(datasetId)).expect(200);

        const { body: finalDelete } = await adminClient.delete(datasetPath(datasetId)).expect(200);
        expect((finalDelete as DeleteEvaluationDatasetResponse).unshared).to.be(false);
        await adminClient.get(datasetPath(datasetId)).expect(404);
      });

      it('rejects a space id that does not exist', async () => {
        await adminClient
          .post(EVALS_DATASETS_URL)
          .send({
            name: `FTR Bad Space ${suffix}`,
            description: 'should be rejected',
            space_ids: [`missing-space-${suffix}`],
          })
          .expect(400);
      });

      it('reassigns spaces through an update', async () => {
        const name = `FTR Reassign ${suffix}`;
        const { body } = await adminClient
          .post(EVALS_DATASETS_URL)
          .send({ name, description: 'starts in the default space' })
          .expect(200);

        const { dataset_id: datasetId } = body as CreateEvaluationDatasetResponse;
        createdDatasetIds.push({ id: datasetId, path: datasetPath });

        const { body: updated } = await adminClient
          .put(datasetPath(datasetId))
          .send({ space_ids: ['default', spaceId] })
          .expect(200);

        expect((updated as UpdateEvaluationDatasetResponse).space_ids?.sort()).to.eql(
          ['default', spaceId].sort()
        );
        await adminClient.get(inSpace(datasetPath(datasetId))).expect(200);
      });

      it('refuses to share a dataset into a space that already holds its name', async () => {
        const name = `FTR Collide ${suffix}`;
        const { body: here } = await adminClient
          .post(EVALS_DATASETS_URL)
          .send({ name, description: 'default space' })
          .expect(200);
        const { body: there } = await adminClient
          .post(EVALS_DATASETS_URL)
          .send({ name, description: 'other space', space_ids: [spaceId] })
          .expect(200);

        createdDatasetIds.push(
          { id: (here as CreateEvaluationDatasetResponse).dataset_id, path: datasetPath },
          {
            id: (there as CreateEvaluationDatasetResponse).dataset_id,
            path: (id) => inSpace(datasetPath(id)),
          }
        );

        // Both would answer to one name in the default space.
        await adminClient
          .put(inSpace(datasetPath((there as CreateEvaluationDatasetResponse).dataset_id)))
          .send({ space_ids: [spaceId, 'default'] })
          .expect(409);
      });

      it('refuses an upsert into a space that already holds its name', async () => {
        const name = `FTR Upsert Collide ${suffix}`;
        const { body } = await adminClient
          .post(EVALS_DATASETS_URL)
          .send({ name, description: 'other space', space_ids: [spaceId] })
          .expect(200);

        createdDatasetIds.push({
          id: (body as CreateEvaluationDatasetResponse).dataset_id,
          path: (id) => inSpace(datasetPath(id)),
        });

        // The route a run uses has to name the collision like the others do,
        // rather than leave a suite with an unexplained failure.
        const { body: conflict } = await adminClient
          .post(EVALS_DATASET_UPSERT_URL)
          .send({ name, description: 'widening', examples: [], space_ids: ['default', spaceId] })
          .expect(409);

        expect((conflict as { message: string }).message).to.contain(name);
      });

      it('refuses to drop the space the update is made from', async () => {
        const name = `FTR Self Removal ${suffix}`;
        const { body } = await adminClient
          .post(EVALS_DATASETS_URL)
          .send({ name, description: 'shared', space_ids: ['default', spaceId] })
          .expect(200);

        const { dataset_id: datasetId } = body as CreateEvaluationDatasetResponse;
        createdDatasetIds.push({ id: datasetId, path: datasetPath });

        await adminClient
          .put(datasetPath(datasetId))
          .send({ space_ids: [spaceId] })
          .expect(400);
      });

      describe('privileges', () => {
        // Manages evaluations in `spaceId`, only reads them in `readOnlySpaceId`,
        // and cannot see the default space at all.
        const readOnlySpaceId = `evals-readonly-${suffix}`;
        let scopedClient: SupertestWithRoleScopeType;

        before(async () => {
          await spaces.create({
            id: readOnlySpaceId,
            name: 'Evals Read Only',
            disabledFeatures: [],
          });
          await samlAuth.setCustomRole({
            elasticsearch: {},
            kibana: [
              { feature: { evals: ['all'] }, spaces: [spaceId] },
              { feature: { evals: ['read'] }, spaces: [readOnlySpaceId] },
            ],
          });
          scopedClient = await getEvalsApiClientForCustomRole(customRoleScopedSupertest);
        });

        after(async () => {
          await scopedClient.destroy();
          await samlAuth.deleteCustomRole();
          await spaces.delete(readOnlySpaceId);
        });

        it('refuses to share into a space the caller can see but cannot manage', async () => {
          await scopedClient
            .post(inSpace(EVALS_DATASETS_URL))
            .send({
              name: `FTR Unmanageable ${suffix}`,
              description: 'should be rejected',
              space_ids: [spaceId, readOnlySpaceId],
            })
            .expect(403);
        });

        it('rejects a space the caller cannot see at all', async () => {
          await scopedClient
            .post(inSpace(EVALS_DATASETS_URL))
            .send({
              name: `FTR Invisible Space ${suffix}`,
              description: 'should be rejected',
              space_ids: [spaceId, 'default'],
            })
            .expect(400);
        });

        it('refuses the spaces wildcard, which is not a space to assign to', async () => {
          await scopedClient
            .post(inSpace(EVALS_DATASETS_URL))
            .send({
              name: `FTR All Spaces ${suffix}`,
              description: 'should be rejected',
              space_ids: [ALL_SPACES_ID],
            })
            .expect(400);
        });

        it('hides the ids of spaces the caller cannot see', async () => {
          const name = `FTR Redacted ${suffix}`;
          const { body } = await adminClient
            .post(EVALS_DATASETS_URL)
            .send({
              name,
              description: 'shared with a hidden space',
              space_ids: ['default', spaceId],
            })
            .expect(200);

          const { dataset_id: datasetId } = body as CreateEvaluationDatasetResponse;
          createdDatasetIds.push({ id: datasetId, path: datasetPath });

          const { body: read } = await scopedClient
            .get(inSpace(datasetPath(datasetId)))
            .expect(200);

          expect((read as GetEvaluationDatasetResponse).space_ids).to.eql([spaceId, UNKNOWN_SPACE]);
        });
      });
    });
  });
}
