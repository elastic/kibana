/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import type { RoleCredentials } from '@kbn/ftr-common-functional-services';
import type { SupertestWithRoleScope } from '../../../services/role_scoped_supertest';
import { disableStreams, enableStreams, linkSlo, unlinkSlo } from '../helpers/requests';
import type { StreamsSupertestRepositoryClient } from '../helpers/repository_client';
import { createStreamsRepositoryAdminClient } from '../helpers/repository_client';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

const DEFAULT_SLO = {
  name: 'Test',
  description: '',
  indicator: {
    type: 'sli.kql.custom',
    params: {
      index: 'logs*',
      good: 'NOT log.level : error',
      total: 'log.level : *',
      timestampField: '@timestamp',
      dataViewId: 'data-view-id',
    },
  },
  budgetingMethod: 'occurrences',
  timeWindow: {
    duration: '30d',
    type: 'rolling',
  },
  objective: {
    target: 0.99,
  },
};

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const esClient = getService('es');
  const samlAuth = getService('samlAuth');
  const dataViewApi = getService('dataViewApi');

  let adminRoleAuthc: RoleCredentials;
  const DATA_VIEW = 'logs*';
  const DATA_VIEW_ID = 'data-view-id';

  let apiClient: StreamsSupertestRepositoryClient;

  let FIRST_SLO_ID: string;
  let SECOND_SLO_ID: string;

  let supertestWithRoleScoped: SupertestWithRoleScope;

  describe('SLO asset linking', function () {
    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);

      adminRoleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
      await dataViewApi.create({
        roleAuthc: adminRoleAuthc,
        id: DATA_VIEW_ID,
        name: DATA_VIEW,
        title: DATA_VIEW,
      });

      supertestWithRoleScoped = await roleScopedSupertest.getSupertestWithRoleScope('admin', {
        useCookieHeader: true,
        withInternalHeaders: true,
      });

      const firstSloResponse = await supertestWithRoleScoped
        .post(`/api/observability/slos`)
        .set(adminRoleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(DEFAULT_SLO)
        .expect(200);
      FIRST_SLO_ID = firstSloResponse.body.id;

      const secondSloResponse = await supertestWithRoleScoped
        .post(`/api/observability/slos`)
        .set(adminRoleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(DEFAULT_SLO)
        .expect(200);
      SECOND_SLO_ID = secondSloResponse.body.id;
    });

    after(async () => {
      await disableStreams(apiClient);

      await supertestWithRoleScoped
        .delete(`/api/observability/slos/${SECOND_SLO_ID}`)
        .set(adminRoleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send()
        .expect(204);
      await dataViewApi.delete({ roleAuthc: adminRoleAuthc, id: DATA_VIEW_ID });
      await samlAuth.invalidateM2mApiKeyWithRoleScope(adminRoleAuthc);
    });

    describe('after linking a SLO', () => {
      before(async () => {
        await linkSlo(apiClient, 'logs', FIRST_SLO_ID);
      });

      after(async () => {
        await unlinkSlo(apiClient, 'logs', FIRST_SLO_ID);
      });

      it('lists the SLO in the stream response', async () => {
        const response = await apiClient.fetch('GET /api/streams/{name} 2023-10-31', {
          params: { path: { name: 'logs' } },
        });

        expect(response.status).to.eql(200);
        expect(response.body.slos.length).to.eql(1);
      });

      it('lists the SLO in the SLOs get response', async () => {
        const response = await apiClient.fetch('GET /api/streams/{name}/slos 2023-10-31', {
          params: { path: { name: 'logs' } },
        });

        expect(response.status).to.eql(200);
        expect(response.body.slos.length).to.eql(1);
      });

      describe('add second SLO', () => {
        before(async () => {
          await linkSlo(apiClient, 'logs', SECOND_SLO_ID);
        });

        after(async () => {
          await unlinkSlo(apiClient, 'logs', SECOND_SLO_ID);
        });

        it('lists the second SLO in the stream response', async () => {
          const response = await apiClient.fetch('GET /api/streams/{name} 2023-10-31', {
            params: { path: { name: 'logs' } },
          });

          expect(response.status).to.eql(200);
          expect(response.body.slos.length).to.eql(2);
        });

        it('lists the second SLO in the SLOs get response', async () => {
          const response = await apiClient.fetch('GET /api/streams/{name}/slos 2023-10-31', {
            params: { path: { name: 'logs' } },
          });

          expect(response.status).to.eql(200);
          expect(response.body.slos.length).to.eql(2);
        });

        it('unlinking one SLO keeps the other', async () => {
          await unlinkSlo(apiClient, 'logs', FIRST_SLO_ID);

          const response = await apiClient.fetch('GET /api/streams/{name}/slos 2023-10-31', {
            params: { path: { name: 'logs' } },
          });

          expect(response.status).to.eql(200);
          expect(response.body.slos.length).to.eql(1);
        });
      });

      describe('after disabling', () => {
        before(async () => {
          // disabling and re-enabling streams wipes the asset links
          await disableStreams(apiClient);
          await enableStreams(apiClient);
        });

        it('dropped all SLOs', async () => {
          const response = await apiClient.fetch('GET /api/streams/{name}/slos 2023-10-31', {
            params: { path: { name: 'logs' } },
          });

          expect(response.status).to.eql(200);
          expect(response.body.slos.length).to.eql(0);
        });

        it('recovers on write and lists the linked SLO', async () => {
          await linkSlo(apiClient, 'logs', FIRST_SLO_ID);

          const response = await apiClient.fetch('GET /api/streams/{name}/slos 2023-10-31', {
            params: { path: { name: 'logs' } },
          });

          expect(response.status).to.eql(200);
          expect(response.body.slos.length).to.eql(1);
        });
      });

      describe('after deleting the SLO', () => {
        it('no longer lists the SLO as a linked asset', async () => {
          await supertestWithRoleScoped
            .delete(`/api/observability/slos/${FIRST_SLO_ID}`)
            .set(adminRoleAuthc.apiKeyHeader)
            .set(samlAuth.getInternalRequestHeader())
            .send()
            .expect(204);

          const response = await apiClient.fetch('GET /api/streams/{name}/slos 2023-10-31', {
            params: { path: { name: 'logs' } },
          });

          expect(response.status).to.eql(200);
          expect(response.body.slos.length).to.eql(0);
        });
      });
    });

    describe('on unmanaged Classic stream', () => {
      before(async () => {
        await esClient.indices.createDataStream({
          name: 'logs-testlogs-default',
        });
      });
      after(async () => {
        await esClient.indices.deleteDataStream({
          name: 'logs-testlogs-default',
        });
      });
      it('does not list any SLOs but returns 200', async () => {
        const response = await apiClient.fetch('GET /api/streams/{name}/slos 2023-10-31', {
          params: { path: { name: 'logs-testlogs-default' } },
        });

        expect(response.status).to.eql(200);
        expect(response.body.slos.length).to.eql(0);
      });
    });
  });
}
