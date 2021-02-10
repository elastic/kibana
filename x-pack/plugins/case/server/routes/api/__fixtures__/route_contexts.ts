/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from 'src/core/server';
import { elasticsearchServiceMock, loggingSystemMock } from 'src/core/server/mocks';
import { createExternalCaseClient } from '../../../client';
import {
  AlertService,
  CaseService,
  CaseConfigureService,
  ConnectorMappingsService,
  CaseUserActionService,
} from '../../../services';
import { authenticationMock } from '../__fixtures__';
import type { CasesRequestHandlerContext } from '../../../types';
import { createActionsClient } from './mock_actions_client';

export const createRouteContext = async (client: any, badAuth = false) => {
  const actionsMock = createActionsClient();

  const log = loggingSystemMock.create().get('case');
  const esClient = elasticsearchServiceMock.createElasticsearchClient();

  const caseService = new CaseService(
    log,
    badAuth ? authenticationMock.createInvalid() : authenticationMock.create()
  );
  const caseConfigureServicePlugin = new CaseConfigureService(log);
  const connectorMappingsServicePlugin = new ConnectorMappingsService(log);
  const caseUserActionsServicePlugin = new CaseUserActionService(log);

  const caseConfigureService = await caseConfigureServicePlugin.setup();
  const userActionService = await caseUserActionsServicePlugin.setup();
  const alertsService = new AlertService();

  const context = ({
    core: {
      savedObjects: {
        client,
      },
    },
    actions: { getActionsClient: () => actionsMock },
    case: {
      getCaseClient: () => caseClient,
    },
    // TODO: remove
    /* securitySolution: {
      getAppClient: () => ({
        getSignalsIndex: () => '.siem-signals',
      }),
    },*/
  } as unknown) as CasesRequestHandlerContext;

  const connectorMappingsService = await connectorMappingsServicePlugin.setup();
  const caseClient = createExternalCaseClient({
    savedObjectsClient: client,
    request: {} as KibanaRequest,
    caseService,
    caseConfigureService,
    connectorMappingsService,
    userActionService,
    alertsService,
    scopedClusterClient: esClient,
  });

  return { context, services: { userActionService } };
};
