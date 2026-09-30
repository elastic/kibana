/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type http from 'http';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  DASHBOARD_SO_TYPE,
} from '@kbn/cases-plugin/common/constants/attachments';
import type { BulkCreateAttachmentsRequestV2 } from '@kbn/cases-plugin/common/types/api';
import { ObjectRemover as ActionsRemover } from '../../../../../alerting_api_integration/common/lib';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { postCaseReq } from '../../../../common/lib/mock';
import {
  bulkCreateAttachments,
  createCase,
  createCaseWithConnector,
  deleteAllCaseItems,
  getComment,
  getServiceNowSimulationServer,
  pushCase,
} from '../../../../common/lib/api';

/**
 * The legacy `/comments/{id}` and `_push` routes predate unified attachments.
 * With the flag on, a case can hold attachment types that only exist in unified
 * form (e.g. dashboard). These assert those routes tolerate such attachments
 * (200, no throw) — the "legacy routes tolerate unified" contract the 9.6 new
 * `/attachments` API + deprecation sweep depends on. See cases_public_read_route_adr.md.
 */
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  const dashboardPayload = {
    type: DASHBOARD_ATTACHMENT_TYPE,
    owner: 'securitySolutionFixture',
    attachmentId: 'dashboard-1',
    metadata: {
      title: 'My dashboard',
      soType: DASHBOARD_SO_TYPE,
    },
  };

  describe('legacy route compatibility with unified-only attachments (feature flag ON)', () => {
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
      const updatedCase = await bulkCreateAttachments({
        supertest,
        caseId: postedCase.id,
        params: [dashboardPayload] as unknown as BulkCreateAttachmentsRequestV2,
      });

      await getComment({
        supertest,
        caseId: postedCase.id,
        commentId: updatedCase.comments![0].id,
        expectedHttpCode: 200,
      });
    });

    it('_push returns 200 when the case holds a unified-only attachment', async () => {
      const { postedCase, connector } = await createCaseWithConnector({
        supertest,
        serviceNowSimulatorURL,
        actionsRemover,
      });

      await bulkCreateAttachments({
        supertest,
        caseId: postedCase.id,
        params: [dashboardPayload] as unknown as BulkCreateAttachmentsRequestV2,
      });

      await pushCase({
        supertest,
        caseId: postedCase.id,
        connectorId: connector.id,
        expectedHttpCode: 200,
      });
    });
  });
};
