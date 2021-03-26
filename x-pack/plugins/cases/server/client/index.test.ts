/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  elasticsearchServiceMock,
  httpServerMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from '../../../../../src/core/server/mocks';
import { nullUser } from '../common';
import {
  connectorMappingsServiceMock,
  createCaseServiceMock,
  createConfigureServiceMock,
  createUserActionServiceMock,
  createAlertServiceMock,
} from '../services/mocks';

jest.mock('./client');
import { CasesClientHandler } from './client';
import { createExternalCasesClient } from './index';
import { featuresPluginMock } from '../../../features/server/mocks';
import { securityMock } from '../../../security/server/mocks';
import { KibanaRequest } from 'kibana/server';
import { CASE_COMMENT_DETAILS_URL } from '../../common/constants';
import { Authorization, AuthorizationAuditLogger } from '../authorization';

const logger = loggingSystemMock.create().get('case');
const esClient = elasticsearchServiceMock.createElasticsearchClient();
const caseConfigureService = createConfigureServiceMock();
const alertsService = createAlertServiceMock();
const caseService = createCaseServiceMock();
const connectorMappingsService = connectorMappingsServiceMock();
const savedObjectsClient = savedObjectsClientMock.create();
const userActionService = createUserActionServiceMock();

describe('createExternalCasesClient()', () => {
  test('it creates the client correctly', async () => {
    const request = httpServerMock.createKibanaRequest({
      path: CASE_COMMENT_DETAILS_URL,
      method: 'get',
      params: {
        case_id: 'mock-id-1',
        comment_id: 'mock-comment-1',
      },
    });

    const auditLogger = securityMock.createSetup().audit.asScoped(request);

    const auth = await Authorization.create({
      request,
      securityAuth: securityMock.createStart().authz,
      getSpace: async (req: KibanaRequest) => undefined,
      features: featuresPluginMock.createStart(),
      auditLogger: new AuthorizationAuditLogger(auditLogger),
    });

    createExternalCasesClient({
      scopedClusterClient: esClient,
      alertsService,
      caseConfigureService,
      caseService,
      connectorMappingsService,
      user: nullUser,
      savedObjectsClient,
      userActionService,
      logger,
      authorization: auth,
    });
    expect(CasesClientHandler).toHaveBeenCalledTimes(1);
  });
});
