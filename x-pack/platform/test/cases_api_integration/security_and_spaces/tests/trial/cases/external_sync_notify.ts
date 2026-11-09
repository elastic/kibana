/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type http from 'http';
import expect from '@kbn/expect';
import { ObjectRemover as ActionsRemover } from '../../../../../alerting_api_integration/common/lib';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

import {
  bindExternalSyncServiceAccount,
  createCaseWithConnector,
  deleteAllCaseItems,
  findCaseUserActions,
  getAuthWithSuperUser,
  getExternalSyncServiceAccount,
  getServiceNowSimulationServer,
  notifyExternalSync,
  pushCase,
  unbindExternalSyncServiceAccount,
} from '../../../../common/lib/api';

const SERVICE_ACCOUNTS_URL = '/internal/security/service_account';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');
  const retry = getService('retry');
  const authSpace1 = getAuthWithSuperUser();

  describe('external_sync notify', () => {
    const actionsRemover = new ActionsRemover(supertest);
    const serviceAccountRole = `cases_external_sync_${Date.now()}`;
    let serviceAccountId: string;
    let serviceNowSimulatorURL: string = '';
    let serviceNowServer: http.Server;

    const createPushedCase = async () => {
      const { postedCase, connector } = await createCaseWithConnector({
        supertest: supertestWithoutAuth,
        serviceNowSimulatorURL,
        actionsRemover,
        auth: authSpace1,
      });
      await pushCase({
        supertest: supertestWithoutAuth,
        caseId: postedCase.id,
        connectorId: connector.id,
        auth: authSpace1,
      });
      return { postedCase, connector };
    };

    before(async () => {
      const { server, url } = await getServiceNowSimulationServer();
      serviceNowServer = server;
      serviceNowSimulatorURL = url;

      await supertest
        .put(`/api/security/role/${serviceAccountRole}`)
        .set('kbn-xsrf', 'true')
        .send({
          elasticsearch: { cluster: [], indices: [] },
          kibana: [{ base: ['all'], spaces: [authSpace1.space] }],
        })
        .expect(204);

      // Created through Kibana, which keeps the credential Core exchanges at run time.
      const { body: account } = await supertest
        .post(SERVICE_ACCOUNTS_URL)
        .set('kbn-xsrf', 'true')
        .set('x-elastic-internal-origin', 'kibana')
        .send({ name: `cases-external-sync-${Date.now()}`, roles: [serviceAccountRole] })
        .expect(200);
      serviceAccountId = account.id;
    });

    afterEach(async () => {
      await deleteAllCaseItems(es);
      await actionsRemover.removeAll();
    });

    after(async () => {
      serviceNowServer.close();
      await supertest
        .delete(`${SERVICE_ACCOUNTS_URL}/${encodeURIComponent(serviceAccountId)}?force=true`)
        .set('kbn-xsrf', 'true')
        .set('x-elastic-internal-origin', 'kibana');
      await supertest.delete(`/api/security/role/${serviceAccountRole}`).set('kbn-xsrf', 'true');
    });

    it('refuses an incident change when no service account is bound to the connector', async () => {
      const { connector } = await createPushedCase();

      await notifyExternalSync({
        supertest: supertestWithoutAuth,
        connectorId: connector.id,
        body: { sys_id: '123' },
        expectedHttpCode: 409,
        auth: authSpace1,
      });
    });

    it('rejects a body that is not a ServiceNow incident change', async () => {
      const { connector } = await createPushedCase();

      await notifyExternalSync({
        supertest: supertestWithoutAuth,
        connectorId: connector.id,
        body: { issue: { id: '123' } },
        expectedHttpCode: 400,
        auth: authSpace1,
      });
    });

    it('returns not found for an incident no case was pushed to', async () => {
      const { connector } = await createPushedCase();

      await notifyExternalSync({
        supertest: supertestWithoutAuth,
        connectorId: connector.id,
        body: { sys_id: 'not-pushed' },
        expectedHttpCode: 404,
        auth: authSpace1,
      });
    });

    it('syncs the case as the bound service account', async () => {
      const { postedCase, connector } = await createPushedCase();

      const { binding } = await bindExternalSyncServiceAccount({
        supertest: supertestWithoutAuth,
        connectorId: connector.id,
        serviceAccountId,
        auth: authSpace1,
      });
      expect(binding?.service_account_id).to.eql(serviceAccountId);

      const fetched = await getExternalSyncServiceAccount({
        supertest: supertestWithoutAuth,
        connectorId: connector.id,
        auth: authSpace1,
      });
      expect(fetched.binding?.service_account_id).to.eql(serviceAccountId);

      const accepted = await notifyExternalSync({
        supertest: supertestWithoutAuth,
        connectorId: connector.id,
        body: { sys_id: '123', sys_updated_on: '2020-03-10 12:24:20' },
        auth: authSpace1,
      });
      expect(accepted.cases).to.eql(1);

      await retry.try(async () => {
        const { userActions } = await findCaseUserActions({
          supertest: supertestWithoutAuth,
          caseID: postedCase.id,
          auth: authSpace1,
        });
        const syncAction = userActions.find((userAction) => userAction.type === 'sync');

        expect(syncAction).not.to.be(undefined);
        expect(syncAction?.created_by.username).not.to.eql(postedCase.created_by.username);
      });
    });

    it('unbinds the service account of the connector', async () => {
      const { connector } = await createPushedCase();
      await bindExternalSyncServiceAccount({
        supertest: supertestWithoutAuth,
        connectorId: connector.id,
        serviceAccountId,
        auth: authSpace1,
      });

      const { unbound } = await unbindExternalSyncServiceAccount({
        supertest: supertestWithoutAuth,
        connectorId: connector.id,
        auth: authSpace1,
      });
      const { binding } = await getExternalSyncServiceAccount({
        supertest: supertestWithoutAuth,
        connectorId: connector.id,
        auth: authSpace1,
      });

      expect(unbound).to.be(true);
      expect(binding).to.be(null);
    });
  });
};
