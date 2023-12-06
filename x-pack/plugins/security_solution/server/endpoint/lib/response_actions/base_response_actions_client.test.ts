/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResponseActionsClient } from './types';
import { ResponseActionsClientImpl } from './base_response_actions_client';
import type { ResponseActionsApiCommandNames } from '../../../../common/endpoint/service/response_actions/constants';
import type {
  ActionDetails,
  LogsEndpointAction,
  LogsEndpointActionResponse,
} from '../../../../common/endpoint/types';
import type { ResponseActionsRequestBody } from '../../../../common/api/endpoint';
import type { CreateActionPayload } from '../../services/actions/create/types';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { EndpointAppContextService } from '../../endpoint_app_context_services';
import {
  createMockEndpointAppContextServiceSetupContract,
  createMockEndpointAppContextServiceStartContract,
} from '../../mocks';
import type { ElasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { ResponseActionsNotSupportedError } from '../../services/actions/clients/errors';
import type { CasesClientMock } from '@kbn/cases-plugin/server/client/mocks';
import { createCasesClientMock } from '@kbn/cases-plugin/server/client/mocks';

describe('`ResponseActionsClientImpl` class', () => {
  let esClient: ElasticsearchClientMock;
  let endpointAppContextService: EndpointAppContextService;
  let baseClassMock: MockClassWithExposedProtectedMembers;
  let casesClient: CasesClientMock;

  beforeEach(async () => {
    esClient = elasticsearchServiceMock.createScopedClusterClient().asInternalUser;
    casesClient = createCasesClientMock();

    endpointAppContextService = new EndpointAppContextService();
    endpointAppContextService.setup(createMockEndpointAppContextServiceSetupContract());
    endpointAppContextService.start(createMockEndpointAppContextServiceStartContract());

    baseClassMock = new MockClassWithExposedProtectedMembers({
      esClient,
      casesClient,
      endpointService: endpointAppContextService,
      username: 'foo',
    });
  });

  describe('Public methods', () => {
    const methods: Array<keyof ResponseActionsClient> = [
      'isolate',
      'release',
      'killProcess',
      'suspendProcess',
      'runningProcesses',
      'getFile',
      'execute',
      'upload',
    ];

    it.each(methods)('should throw Not Supported error for %s()', async (method) => {
      // @ts-expect-error ignoring input type to method since they all should throw
      await expect(baseClassMock[method]({})).rejects.toBeInstanceOf(
        ResponseActionsNotSupportedError
      );
    });
  });

  describe('#updateCases()', () => {
    // TODO:PT implement
  });

  describe('#fetchActionDetails()', () => {
    // TODO:PT Implement
  });

  describe('#writeActionRequestToEndpointIndex()', () => {
    // TODO:PT Implement
  });

  describe('#writeActionResponseToEndpointIndex()', () => {
    // TODO:PT implement
  });
});

class MockClassWithExposedProtectedMembers extends ResponseActionsClientImpl {
  public async updateCases({
    command,
    hosts,
    caseIds = [],
    alertIds = [],
    comment = '',
  }: {
    command: ResponseActionsApiCommandNames;
    hosts: Array<{ hostname: string; endpointId: string }>;
    caseIds?: string[];
    alertIds?: string[];
    comment?: string;
  }): Promise<void> {
    return super.updateCases({
      command,
      hosts,
      caseIds,
      alertIds,
      comment,
    });
  }

  public async fetchActionDetails<T extends ActionDetails = ActionDetails>(
    actionId: string
  ): Promise<T> {
    return super.fetchActionDetails(actionId);
  }

  public async writeActionRequestToEndpointIndex(
    actionRequest: ResponseActionsRequestBody &
      Pick<CreateActionPayload, 'command' | 'hosts' | 'rule_id' | 'rule_name'>
  ): Promise<LogsEndpointAction> {
    return super.writeActionRequestToEndpointIndex(actionRequest);
  }

  public async writeActionResponseToEndpointIndex<TOutputContent extends object = object>({
    actionId,
    error,
    agentId,
    data,
  }: { agentId: LogsEndpointActionResponse['agent']['id']; actionId: string } & Pick<
    LogsEndpointActionResponse,
    'error'
  > &
    Pick<LogsEndpointActionResponse<TOutputContent>['EndpointActions'], 'data'>): Promise<
    LogsEndpointActionResponse<TOutputContent>
  > {
    return super.writeActionResponseToEndpointIndex({
      actionId,
      error,
      agentId,
      data,
    });
  }
}
