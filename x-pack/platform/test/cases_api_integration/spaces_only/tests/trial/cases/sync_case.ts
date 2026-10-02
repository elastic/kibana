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
  pushCase,
  syncCase,
  deleteAllCaseItems,
  getAuthWithSuperUser,
  createCaseWithConnector,
  getServiceNowSimulationServer,
  findCaseUserActions,
  updateCase,
  getCase,
  createCase,
  createConfiguration,
  getConfiguration,
  getConfigurationRequest,
  createComment,
  getAllComments,
} from '../../../../common/lib/api';
import { postCaseReq, postCommentUserReq } from '../../../../common/lib/mock';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');
  const authSpace1 = getAuthWithSuperUser();

  describe('sync_case', () => {
    const actionsRemover = new ActionsRemover(supertest);
    let serviceNowSimulatorURL: string = '';
    let serviceNowServer: http.Server;

    before(async () => {
      const { server, url } = await getServiceNowSimulationServer();
      serviceNowServer = server;
      serviceNowSimulatorURL = url;
    });

    afterEach(async () => {
      await deleteAllCaseItems(es);
      await actionsRemover.removeAll();
    });

    after(async () => {
      serviceNowServer.close();
    });

    it('persists the externalSync settings on the case', async () => {
      const { postedCase } = await createCaseWithConnector({
        supertest: supertestWithoutAuth,
        serviceNowSimulatorURL,
        actionsRemover,
        auth: authSpace1,
      });
      const externalSync = { autoPush: true, conflictStrategy: 'kibana' as const };

      await updateCase({
        supertest: supertestWithoutAuth,
        params: {
          cases: [
            {
              id: postedCase.id,
              version: postedCase.version,
              settings: { ...postedCase.settings, externalSync },
            },
          ],
        },
        auth: authSpace1,
      });

      const theCase = await getCase({
        supertest: supertestWithoutAuth,
        caseId: postedCase.id,
        auth: authSpace1,
      });

      expect(theCase.settings.externalSync).to.eql(externalSync);
    });

    it('applies the configuration external sync defaults to a new case', async () => {
      const externalSync = { autoPush: true, conflictStrategy: 'kibana' as const };
      await createConfiguration(
        supertestWithoutAuth,
        getConfigurationRequest({ overrides: { externalSync } }),
        200,
        authSpace1
      );

      const [configuration] = await getConfiguration({
        supertest: supertestWithoutAuth,
        auth: authSpace1,
      });
      const theCase = await createCase(supertestWithoutAuth, postCaseReq, 200, authSpace1);

      expect(configuration.externalSync).to.eql(externalSync);
      expect(theCase.settings.externalSync).to.eql(externalSync);
    });

    it('persists the per-field sync rules on the configuration and rejects unsupported directions', async () => {
      const externalSyncFields = [
        {
          field: 'title' as const,
          direction: 'pull' as const,
          conflictStrategy: 'kibana' as const,
        },
        { field: 'comments' as const, direction: 'off' as const },
      ];
      const configuration = await createConfiguration(
        supertestWithoutAuth,
        getConfigurationRequest({ overrides: { externalSyncFields } }),
        200,
        authSpace1
      );

      expect(configuration.externalSyncFields).to.eql(externalSyncFields);

      const [fetched] = await getConfiguration({
        supertest: supertestWithoutAuth,
        auth: authSpace1,
      });
      expect(fetched.externalSyncFields).to.eql(externalSyncFields);

      await createConfiguration(
        supertestWithoutAuth,
        getConfigurationRequest({
          overrides: { externalSyncFields: [{ field: 'status', direction: 'push' }] },
        }),
        400,
        authSpace1
      );
    });

    it('does not mark comments as pushed when the comments direction is off', async () => {
      const { postedCase, connector } = await createCaseWithConnector({
        supertest: supertestWithoutAuth,
        serviceNowSimulatorURL,
        actionsRemover,
        auth: authSpace1,
        configureReq: { externalSyncFields: [{ field: 'comments', direction: 'off' }] },
      });
      await createComment({
        supertest: supertestWithoutAuth,
        caseId: postedCase.id,
        params: postCommentUserReq,
        auth: authSpace1,
      });

      const pushed = await pushCase({
        supertest: supertestWithoutAuth,
        caseId: postedCase.id,
        connectorId: connector.id,
        auth: authSpace1,
      });

      expect(pushed.external_service?.external_id).to.eql('123');
      const comments = await getAllComments({
        supertest: supertestWithoutAuth,
        caseId: postedCase.id,
        auth: authSpace1,
      });
      expect(comments.map((comment) => comment.pushed_at)).to.eql([null]);
    });

    it('reads the incident back and records a sync user action', async () => {
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

      const theCase = await syncCase({
        supertest: supertestWithoutAuth,
        caseId: postedCase.id,
        auth: authSpace1,
      });

      // The simulated incident carries no title, description or state, so the case is unchanged.
      expect(theCase.title).to.eql(postedCase.title);
      expect(theCase.status).to.eql(postedCase.status);
      expect(theCase.external_service?.external_id).to.eql('123');

      const { userActions } = await findCaseUserActions({
        supertest: supertestWithoutAuth,
        caseID: postedCase.id,
        auth: authSpace1,
      });
      const syncAction = userActions.find((userAction) => userAction.type === 'sync');

      expect(syncAction?.payload).to.eql({
        sync: {
          connector_name: connector.name,
          external_id: '123',
          external_title: 'INC01',
          external_url: theCase.external_service?.external_url,
          updated_fields: [],
          conflicted_fields: [],
          external_updated_at: '2020-03-10 12:24:20',
        },
      });
    });

    it('rejects a case that was never pushed', async () => {
      const { postedCase } = await createCaseWithConnector({
        supertest: supertestWithoutAuth,
        serviceNowSimulatorURL,
        actionsRemover,
        auth: authSpace1,
      });

      await syncCase({
        supertest: supertestWithoutAuth,
        caseId: postedCase.id,
        auth: authSpace1,
        expectedHttpCode: 400,
      });
    });

    it('does not sync a case from a different space', async () => {
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

      await syncCase({
        supertest: supertestWithoutAuth,
        caseId: postedCase.id,
        auth: getAuthWithSuperUser('space2'),
        expectedHttpCode: 404,
      });
    });
  });
};
