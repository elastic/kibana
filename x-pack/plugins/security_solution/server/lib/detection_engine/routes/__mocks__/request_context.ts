/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AwaitedProperties } from '@kbn/utility-types';
import type { MockedKeys } from '@kbn/utility-types-jest';
import type { KibanaRequest } from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';

import type { ActionsApiRequestHandlerContext } from '@kbn/actions-plugin/server';
import type { AlertingApiRequestHandlerContext } from '@kbn/alerting-plugin/server';
import { rulesClientMock } from '@kbn/alerting-plugin/server/mocks';

// See: https://github.com/elastic/kibana/issues/117255, the moduleNameMapper creates mocks to avoid memory leaks from kibana core.
// We cannot import from "../../../../../../actions/server" directly here or we have a really bad memory issue. We cannot add this to the existing mocks we created, this fix must be here.
import { actionsClientMock } from '@kbn/actions-plugin/server/actions_client.mock';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { listMock } from '@kbn/lists-plugin/server/mocks';
import { ruleRegistryMocks } from '@kbn/rule-registry-plugin/server/mocks';

import { siemMock } from '../../../../mocks';
import { createMockConfig } from '../../../../config.mock';
import { ruleExecutionLogMock } from '../../rule_monitoring/mocks';
import { requestMock } from './request';
import { internalFrameworkRequest } from '../../../framework';

import type {
  SecuritySolutionApiRequestHandlerContext,
  SecuritySolutionRequestHandlerContext,
} from '../../../../types';

import { getEndpointAuthzInitialStateMock } from '../../../../../common/endpoint/service/authz/mocks';
import type { EndpointAuthz } from '../../../../../common/endpoint/types/authz';

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

export type SecuritySolutionRequestHandlerContextMock = MockedKeys<
  AwaitedProperties<Omit<SecuritySolutionRequestHandlerContext, 'resolve'>>
> & {
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

const convertRequestContextMock = (
  context: AwaitedProperties<SecuritySolutionRequestHandlerContextMock>
): SecuritySolutionRequestHandlerContext => {
  return coreMock.createCustomRequestHandlerContext(
    context
  ) as unknown as SecuritySolutionRequestHandlerContext;
};

const createSecuritySolutionRequestContextMock = (
  clients: MockClients,
  overrides: { endpointAuthz?: Partial<EndpointAuthz> } = {}
): jest.Mocked<SecuritySolutionApiRequestHandlerContext> => {
  const core = clients.core;
  const kibanaRequest = requestMock.create();
  const licensing = licensingMock.createSetup();

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
    getRacClient: jest.fn((req: KibanaRequest) => {
      throw new Error('Not implemented');
    }),
    getSpaceId: jest.fn(() => 'default'),
    getRuleDataService: jest.fn(() => clients.ruleDataService),
    getRuleExecutionLog: jest.fn(() => clients.ruleExecutionLog),
    getExceptionListClient: jest.fn(() => clients.lists.exceptionListClient),
    getInternalFleetServices: jest.fn(() => {
      // TODO: Mock EndpointInternalFleetServicesInterface and return the mocked object.
      throw new Error('Not implemented');
    }),
    getScopedFleetServices: jest.fn((req: KibanaRequest) => {
      // TODO: Mock EndpointScopedFleetServicesInterface and return the mocked object.
      throw new Error('Not implemented');
    }),
    getQueryRuleAdditionalOptions: {
      licensing,
      osqueryCreateAction: jest.fn(),
    },
  };
};

const createTools = () => {
  const clients = createMockClients();
  const context = createRequestContextMock(clients);

  return { clients, context };
};

export const requestContextMock = {
  create: createRequestContextMock,
  convertContext: convertRequestContextMock,
  createMockClients,
  createTools,
};
