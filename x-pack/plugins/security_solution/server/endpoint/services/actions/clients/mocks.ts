/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClientMock } from '@kbn/actions-plugin/server/actions_client/actions_client.mock';
import { actionsClientMock } from '@kbn/actions-plugin/server/actions_client/actions_client.mock';
import type { ConnectorWithExtraFindData } from '@kbn/actions-plugin/server/application/connector/types';
import { SENTINELONE_CONNECTOR_ID } from '@kbn/stack-connectors-plugin/common/sentinelone/constants';
import type { DeepPartial } from 'utility-types';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import type { ElasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import type { CasesClientMock } from '@kbn/cases-plugin/server/client/mocks';
import { createCasesClientMock } from '@kbn/cases-plugin/server/client/mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { merge } from 'lodash';
import type { DeepMutable } from '../../../../../common/endpoint/types/utility_types';
import { EndpointAppContextService } from '../../../endpoint_app_context_services';
import {
  createMockEndpointAppContextServiceSetupContract,
  createMockEndpointAppContextServiceStartContract,
} from '../../../mocks';
import type { IsolationRouteRequestBody } from '../../../../../common/api/endpoint';
import type { ResponseActionsClientOptions } from './lib/base_response_actions_client';

export interface ResponseActionsClientOptionsMock extends ResponseActionsClientOptions {
  esClient: ElasticsearchClientMock;
  casesClient?: CasesClientMock;
}

const createConstructorOptionsMock = (): Required<ResponseActionsClientOptionsMock> => {
  const esClient = elasticsearchServiceMock.createScopedClusterClient().asInternalUser;
  const casesClient = createCasesClientMock();
  const endpointService = new EndpointAppContextService();

  endpointService.setup(createMockEndpointAppContextServiceSetupContract());
  endpointService.start(createMockEndpointAppContextServiceStartContract());

  return {
    esClient,
    casesClient,
    endpointService,
    username: 'foo',
  };
};

const createIsolateOptionsMock = (
  overrides: Partial<IsolationRouteRequestBody> = {}
): DeepMutable<IsolationRouteRequestBody> => {
  const isolateOptions: IsolationRouteRequestBody = {
    endpoint_ids: ['1-2-3'],
    comment: 'test comment',
  };

  return merge(isolateOptions, overrides);
};

const createConnectorActionsClientMock = (): ActionsClientMock => {
  const client = actionsClientMock.create();

  // Mock result of retrieving list of connectors
  (client.getAll as jest.Mock).mockImplementation(async () => {
    const result: ConnectorWithExtraFindData[] = [
      // SentinelOne connector
      createConnectorMock({ actionTypeId: SENTINELONE_CONNECTOR_ID }),
    ];

    return result;
  });

  (client.execute as jest.Mock).mockImplementation(async () => {
    return createExecuteResponseMock();
  });

  return client;
};

const createConnectorMock = (
  overrides: DeepPartial<ConnectorWithExtraFindData> = {}
): ConnectorWithExtraFindData => {
  return merge(
    {
      id: 'connector-mock-id-1',
      actionTypeId: '.some-type',
      name: 'some mock name',
      isMissingSecrets: false,
      config: {},
      isPreconfigured: false,
      isDeprecated: false,
      isSystemAction: false,
      referencedByCount: 0,
    },
    overrides
  );
};

const createExecuteResponseMock = (
  overrides: DeepPartial<ActionTypeExecutorResult<{}>> = {}
): ActionTypeExecutorResult<{}> => {
  const result: ActionTypeExecutorResult<{}> = {
    actionId: 'execute-response-mock-1',
    data: undefined,
    message: 'some mock message',
    serviceMessage: 'some mock service message',
    retry: true,
    status: 'ok',
  };

  return merge(result, overrides);
};

export const responseActionsClientMock = Object.freeze({
  createConstructorOptions: createConstructorOptionsMock,
  createIsolateOptions: createIsolateOptionsMock,
  createReleaseOptions: createIsolateOptionsMock,
  // TODO:PT add more methods to get option mocks for other class methods

  createConnectorActionsClient: createConnectorActionsClientMock,
  createConnector: createConnectorMock,
  createExecuteResponse: createExecuteResponseMock,
});
