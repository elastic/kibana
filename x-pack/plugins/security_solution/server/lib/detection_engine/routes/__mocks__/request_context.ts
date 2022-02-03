/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MockedKeys } from '@kbn/utility-types/jest';
import { coreMock } from 'src/core/server/mocks';

import { ActionsApiRequestHandlerContext } from '../../../../../../actions/server';
import { AlertingApiRequestHandlerContext } from '../../../../../../alerting/server';
import { rulesClientMock } from '../../../../../../alerting/server/mocks';

// See: https://github.com/elastic/kibana/issues/117255, the moduleNameMapper creates mocks to avoid memory leaks from kibana core.
// We cannot import from "../../../../../../actions/server" directly here or we have a really bad memory issue. We cannot add this to the existing mocks we created, this fix must be here.
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { actionsClientMock } from '../../../../../../actions/server/actions_client.mock';
import { licensingMock } from '../../../../../../licensing/server/mocks';
import { listMock } from '../../../../../../lists/server/mocks';
import { ruleRegistryMocks } from '../../../../../../rule_registry/server/mocks';

import { siemMock } from '../../../../mocks';
import { createMockConfig } from '../../../../config.mock';
import { ruleExecutionLogMock } from '../../rule_execution_log/__mocks__';
import { requestMock } from './request';
import { internalFrameworkRequest } from '../../../framework';

import type {
  SecuritySolutionApiRequestHandlerContext,
  SecuritySolutionRequestHandlerContext,
} from '../../../../types';
import { getEndpointAuthzInitialStateMock } from '../../../../../common/endpoint/service/authz';
import { EndpointAuthz } from '../../../../../common/endpoint/types/authz';

export const createMockClients = () => {
  const core = coreMock.createRequestHandlerContext();
  const license = licensingMock.createLicenseMock();

  return {
    core,
    clusterClient: core.elasticsearch.client,
    savedObjectsClient: core.savedObjects.client,

    licensing: {
      ...licensingMock.createRequestHandlerContext({ license }),
      license,
    },
    lists: {
      listClient: listMock.getListClient(),
      exceptionListClient: listMock.getExceptionListClient(core.savedObjects.client),
    },
    rulesClient: rulesClientMock.create(),
    actionsClient: actionsClientMock.create(),
    ruleDataService: ruleRegistryMocks.createRuleDataService(),

    config: createMockConfig(),
    appClient: siemMock.createClient(),
    ruleExecutionLog: ruleExecutionLogMock.forRoutes.create(),
  };
};

type MockClients = ReturnType<typeof createMockClients>;

type SecuritySolutionRequestHandlerContextMock =
  MockedKeys<SecuritySolutionRequestHandlerContext> & {
    core: MockClients['core'];
  };

const createRequestContextMock = (
  clients: MockClients = createMockClients(),
  overrides: { endpointAuthz?: Partial<EndpointAuthz> } = {}
): SecuritySolutionRequestHandlerContextMock => {
  return {
    core: clients.core,
    securitySolution: createSecuritySolutionRequestContextMock(clients, overrides),
    actions: {
      getActionsClient: jest.fn(() => clients.actionsClient),
    } as unknown as jest.Mocked<ActionsApiRequestHandlerContext>,
    alerting: {
      getRulesClient: jest.fn(() => clients.rulesClient),
    } as unknown as jest.Mocked<AlertingApiRequestHandlerContext>,
    licensing: clients.licensing,
    lists: {
      getListClient: jest.fn(() => clients.lists.listClient),
      getExceptionListClient: jest.fn(() => clients.lists.exceptionListClient),
      getExtensionPointClient: jest.fn(),
    },
  };
};

const createSecuritySolutionRequestContextMock = (
  clients: MockClients,
  overrides: { endpointAuthz?: Partial<EndpointAuthz> } = {}
): jest.Mocked<SecuritySolutionApiRequestHandlerContext> => {
  const core = clients.core;
  const kibanaRequest = requestMock.create();

  return {
    core,
    endpointAuthz: getEndpointAuthzInitialStateMock(overrides.endpointAuthz),
    getConfig: jest.fn(() => clients.config),
    getFrameworkRequest: jest.fn(() => {
      return {
        ...kibanaRequest.body,
        [internalFrameworkRequest]: kibanaRequest,
        context: { core },
        user: {
          username: 'mockUser',
        },
      };
    }),
    getAppClient: jest.fn(() => clients.appClient),
    getSpaceId: jest.fn(() => 'default'),
    getRuleDataService: jest.fn(() => clients.ruleDataService),
    getRuleExecutionLog: jest.fn(() => clients.ruleExecutionLog),
    getExceptionListClient: jest.fn(() => clients.lists.exceptionListClient),
  };
};

const createTools = () => {
  const clients = createMockClients();
  const context = createRequestContextMock(clients);

  return { clients, context };
};

export const requestContextMock = {
  create: createRequestContextMock,
  createMockClients,
  createTools,
};
