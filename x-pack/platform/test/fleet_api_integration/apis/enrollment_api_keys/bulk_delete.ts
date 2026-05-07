/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { cleanFleetIndices } from '../space_awareness/helpers';
import { SpaceTestApiClient } from '../space_awareness/api_helper';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const es = getService('es');
  const supertest = getService('supertest');
  const fleetAndAgents = getService('fleetAndAgents');
  const kibanaServer = getService('kibanaServer');
  const apiClient = new SpaceTestApiClient(supertest);

  describe('fleet_enrollment_api_keys_bulk_delete', () => {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await cleanFleetIndices(es);
      await fleetAndAgents.setup();
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await cleanFleetIndices(es);
    });

    skipIfNoDockerRegistry(providerContext);

    describe('POST /fleet/enrollment_api_keys/_bulk_delete', () => {
      it('should return 400 if neither tokenIds nor kuery is provided', async () => {
        await supertest
          .post(`/api/fleet/enrollment_api_keys/_bulk_delete`)
          .set('kbn-xsrf', 'xxx')
          .send({ forceDelete: false })
          .expect(400);
      });

      describe('bulk revoke by tokenIds', () => {
        let keyIds: string[];
        let esApiKeyIds: string[];

        before(async () => {
          await apiClient.createAgentPolicy(undefined, { id: 'bulk-revoke-policy' });

          const created = await Promise.all(
            Array.from({ length: 3 }, () =>
              supertest
                .post(`/api/fleet/enrollment_api_keys`)
                .set('kbn-xsrf', 'xxx')
                .send({ policy_id: 'bulk-revoke-policy' })
                .expect(200)
            )
          );

          keyIds = created.map((r) => r.body.item.id);
          esApiKeyIds = created.map((r) => r.body.item.api_key_id);
        });

        it('should revoke multiple enrollment tokens', async () => {
          const { body } = await supertest
            .post(`/api/fleet/enrollment_api_keys/_bulk_delete`)
            .set('kbn-xsrf', 'xxx')
            .send({ tokenIds: keyIds, forceDelete: false })
            .expect(200);

          expect(body.successCount).to.be(3);
          expect(body.errorCount).to.be(0);

          for (const esApiKeyId of esApiKeyIds) {
            const { api_keys: apiKeys } = await es.security.getApiKey({ id: esApiKeyId });
            expect(apiKeys).length(1);
            expect(apiKeys[0].invalidated).eql(true);
          }

          // Tokens should still exist but be inactive
          for (const keyId of keyIds) {
            const { body: getBody } = await supertest
              .get(`/api/fleet/enrollment_api_keys/${keyId}`)
              .expect(200);
            expect(getBody.item.active).to.be(false);
          }
        });
      });

      describe('bulk delete (forceDelete) by tokenIds', () => {
        let keyIds: string[];
        let esApiKeyIds: string[];

        before(async () => {
          await apiClient.createAgentPolicy(undefined, { id: 'bulk-delete-policy' });

          const created = await Promise.all(
            Array.from({ length: 3 }, () =>
              supertest
                .post(`/api/fleet/enrollment_api_keys`)
                .set('kbn-xsrf', 'xxx')
                .send({ policy_id: 'bulk-delete-policy' })
                .expect(200)
            )
          );

          keyIds = created.map((r) => r.body.item.id);
          esApiKeyIds = created.map((r) => r.body.item.api_key_id);
        });

        it('should delete multiple enrollment tokens', async () => {
          const { body } = await supertest
            .post(`/api/fleet/enrollment_api_keys/_bulk_delete`)
            .set('kbn-xsrf', 'xxx')
            .send({ tokenIds: keyIds, forceDelete: true })
            .expect(200);

          expect(body.successCount).to.be(3);
          expect(body.errorCount).to.be(0);

          for (const esApiKeyId of esApiKeyIds) {
            const { api_keys: apiKeys } = await es.security.getApiKey({ id: esApiKeyId });
            expect(apiKeys).length(1);
            expect(apiKeys[0].invalidated).eql(true);
          }

          // Tokens should no longer exist
          for (const keyId of keyIds) {
            await supertest.get(`/api/fleet/enrollment_api_keys/${keyId}`).expect(404);
          }
        });
      });

      describe('bulk revoke by kuery', () => {
        let allPolicyKeyIds: string[];

        before(async () => {
          await apiClient.createAgentPolicy(undefined, { id: 'bulk-kuery-policy' });

          await Promise.all(
            Array.from({ length: 2 }, () =>
              supertest
                .post(`/api/fleet/enrollment_api_keys`)
                .set('kbn-xsrf', 'xxx')
                .send({ policy_id: 'bulk-kuery-policy' })
                .expect(200)
            )
          );

          // Include the auto-created default enrollment key
          const { body: allKeys } = await supertest
            .get(`/api/fleet/enrollment_api_keys?kuery=policy_id:bulk-kuery-policy`)
            .expect(200);
          allPolicyKeyIds = allKeys.items.map((k: any) => k.id);
        });

        it('should revoke tokens matching the kuery', async () => {
          const { body } = await supertest
            .post(`/api/fleet/enrollment_api_keys/_bulk_delete`)
            .set('kbn-xsrf', 'xxx')
            .send({ kuery: 'policy_id:bulk-kuery-policy', forceDelete: false })
            .expect(200);

          expect(body.successCount).to.be(allPolicyKeyIds.length);
          expect(body.errorCount).to.be(0);

          for (const keyId of allPolicyKeyIds) {
            const { body: getBody } = await supertest
              .get(`/api/fleet/enrollment_api_keys/${keyId}`)
              .expect(200);
            expect(getBody.item.active).to.be(false);
          }
        });
      });

      describe('hidden keys (managed policy)', () => {
        let hiddenKeyIds: string[];

        before(async () => {
          await apiClient.createAgentPolicy(undefined, {
            id: 'bulk-hidden-policy',
            is_managed: true,
          });

          const created = await Promise.all(
            Array.from({ length: 2 }, () =>
              supertest
                .post(`/api/fleet/enrollment_api_keys`)
                .set('kbn-xsrf', 'xxx')
                .send({ policy_id: 'bulk-hidden-policy' })
                .expect(200)
            )
          );

          hiddenKeyIds = created.map((r) => r.body.item.id);
        });

        it('should skip hidden keys by default when bulk deleting by tokenIds', async () => {
          const { body } = await supertest
            .post(`/api/fleet/enrollment_api_keys/_bulk_delete`)
            .set('kbn-xsrf', 'xxx')
            .send({ tokenIds: hiddenKeyIds, forceDelete: true })
            .expect(200);

          expect(body.successCount).to.be(0);

          // Keys should still exist
          for (const keyId of hiddenKeyIds) {
            await supertest.get(`/api/fleet/enrollment_api_keys/${keyId}`).expect(200);
          }
        });

        it('should delete hidden keys when includeHidden is true', async () => {
          const { body } = await supertest
            .post(`/api/fleet/enrollment_api_keys/_bulk_delete`)
            .set('kbn-xsrf', 'xxx')
            .send({ tokenIds: hiddenKeyIds, forceDelete: true, includeHidden: true })
            .expect(200);

          expect(body.successCount).to.be(2);

          for (const keyId of hiddenKeyIds) {
            await supertest.get(`/api/fleet/enrollment_api_keys/${keyId}`).expect(404);
          }
        });
      });
    });
  });
}
