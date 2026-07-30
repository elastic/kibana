/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type http from 'http';
import {
  CASE_ATTACHMENT_SAVED_OBJECT,
  DASHBOARD_ATTACHMENT_TYPE,
  DASHBOARD_SO_TYPE,
} from '@kbn/cases-plugin/common/constants';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server/src/saved_objects_index_pattern';
import type { Client } from '@elastic/elasticsearch';
import { ObjectRemover as ActionsRemover } from '../../../../../alerting_api_integration/common/lib';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { postCaseReq } from '../../../../common/lib/mock';
import {
  createCase,
  createCaseWithConnector,
  deleteAllCaseItems,
  getComment,
  getServiceNowSimulationServer,
  pushCase,
} from '../../../../common/lib/api';

/**
 * FF-OFF mirror of `attachments_framework/legacy_route_compat.ts`.
 *
 * The read path always spans both SOs, so a unified-only attachment (e.g. a
 * dashboard) can surface through the legacy `/comments/{id}` and `_push` routes
 * even with the flag off. There is no FF-OFF write path for unified-only types,
 * so the row is seeded directly into `cases-attachments`. This locks in the
 * "legacy routes tolerate unified" contract from cases_public_read_route_adr.md.
 */
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  const seedDashboardAttachment = async (client: Client, caseId: string): Promise<string> => {
    const seededId = 'dashboard-seeded-unified';
    await client.index({
      index: ALERTING_CASES_SAVED_OBJECT_INDEX,
      id: `${CASE_ATTACHMENT_SAVED_OBJECT}:${seededId}`,
      refresh: 'wait_for',
      document: {
        type: CASE_ATTACHMENT_SAVED_OBJECT,
        [CASE_ATTACHMENT_SAVED_OBJECT]: {
          type: DASHBOARD_ATTACHMENT_TYPE,
          attachmentId: 'dashboard-1',
          owner: 'securitySolutionFixture',
          metadata: { title: 'My dashboard', soType: DASHBOARD_SO_TYPE },
          created_at: '2024-01-01T00:00:00.000Z',
          created_by: { username: 'elastic', full_name: null, email: null },
          pushed_at: null,
          pushed_by: null,
          updated_at: null,
          updated_by: null,
        },
        references: [{ type: 'cases', id: caseId, name: 'associated-cases' }],
        namespaces: ['default'],
        updated_at: '2024-01-01T00:00:00.000Z',
        coreMigrationVersion: '8.8.0',
      },
    });
    return seededId;
  };

  describe('legacy route compatibility with unified-only attachments (feature flag OFF)', () => {
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

    it('GET /comments/{id} returns 200 for a unified-only attachment', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      const seededId = await seedDashboardAttachment(es, postedCase.id);

      await getComment({
        supertest,
        caseId: postedCase.id,
        commentId: seededId,
        expectedHttpCode: 200,
      });
    });

    it('_push returns 200 when the case holds a unified-only attachment', async () => {
      const { postedCase, connector } = await createCaseWithConnector({
        supertest,
        serviceNowSimulatorURL,
        actionsRemover,
      });

      await seedDashboardAttachment(es, postedCase.id);

      await pushCase({
        supertest,
        caseId: postedCase.id,
        connectorId: connector.id,
        expectedHttpCode: 200,
      });
    });
  });
};
