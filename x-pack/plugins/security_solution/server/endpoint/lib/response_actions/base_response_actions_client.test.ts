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
import type { CasesByAlertIDParams } from '@kbn/cases-plugin/server/client/cases/get';

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
    const KNOWN_ALERT_ID_1 = 'alert-1';
    const KNOWN_ALERT_ID_2 = 'alert-2';
    const KNOWN_ALERT_ID_3 = 'alert-3';

    beforeEach(async () => {
      (casesClient.cases.getCasesByAlertID as jest.Mock).mockImplementation(
        async ({ alertID }: CasesByAlertIDParams) => {
          if (alertID === KNOWN_ALERT_ID_1) {
            return [{ id: 'case-1' }, { id: 'case-2' }, { id: 'case-3' }];
          }

          if (alertID === KNOWN_ALERT_ID_2) {
            return [{ id: 'case-3' }];
          }

          if (alertID === KNOWN_ALERT_ID_3) {
            return [];
          }

          throw new Error('test: alert id not found');
        }
      );
    });

    it.todo('should do nothing if no caseIds nor alertIds are provided');

    it.todo('should do nothing if no hosts were provided');

    it.todo('should do nothing if cases client was not provided');

    it.todo('should retrieve case IDs from alerts if alertIds was provided');

    it.todo('should not error is retrieving case id for alert fails');

    it.todo('should do nothing if alertIDs were not associated with any cases');

    it.todo('should update cases with an attachment for each host');

    it.todo('should not error if update to a case fails');
  });

  describe('#fetchActionDetails()', () => {
    it.todo('should retrieve action details');
  });

  describe('#writeActionRequestToEndpointIndex()', () => {
    it.todo('should return indexed record on success');

    it.todo('should include alert_ids if any were provided');

    it.todo('should included hosts if any where provided');

    it.todo('should include Rule information if rule_id and rule_name were provided');

    it.todo('should error if index of document did not return a 201');

    it.todo('should throw ResponseActionsClientError if operation fails');
  });

  describe('#writeActionResponseToEndpointIndex()', () => {
    it.todo('should return indexed record on success');

    it.todo('should throw ResponseActionsClientError if operation fails');
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
