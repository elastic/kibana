/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import type { CasesClientMock } from '@kbn/cases-plugin/server/client/mocks';
import { createCasesClientMock } from '@kbn/cases-plugin/server/client/mocks';
import type { ElasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import type { Mutable } from 'utility-types';
import { merge } from 'lodash';
import type { IsolationRouteRequestBody } from '../../../../../../common/api/endpoint';
import { EndpointAppContextService } from '../../../../endpoint_app_context_services';
import {
  createMockEndpointAppContextServiceSetupContract,
  createMockEndpointAppContextServiceStartContract,
} from '../../../../mocks';
import type { ResponseActionsClientOptions } from './base_response_actions_client';

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
): Mutable<IsolationRouteRequestBody> => {
  const isolateOptions: IsolationRouteRequestBody = {
    endpoint_ids: ['1-2-3'],
    comment: 'test comment',
  };

  return merge(isolateOptions, overrides);
};

export const responseActionsClientMock = Object.freeze({
  createConstructorOptions: createConstructorOptionsMock,
  createIsolateOptions: createIsolateOptionsMock,
  createReleaseOptions: createIsolateOptionsMock,
  // TODO:PT add more methods to get option mocks for other class methods
});
