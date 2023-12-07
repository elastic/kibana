/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResponseActionsClient } from './types';
import type {
  ResponseActionsClientUpdateCasesOptions,
  ResponseActionsClientWriteActionRequestToEndpointIndexOptions,
  ResponseActionsClientWriteActionResponseToEndpointIndexOptions,
} from './base_response_actions_client';
import { ResponseActionsClientImpl } from './base_response_actions_client';
import type {
  ActionDetails,
  LogsEndpointAction,
  LogsEndpointActionResponse,
} from '../../../../common/endpoint/types';
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
import type { Logger } from '@kbn/logging';
import { getActionDetailsById as _getActionDetailsById } from '../../services/actions/action_details_by_id';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { TransportResult } from '@elastic/elasticsearch';
import { ENDPOINT_ACTIONS_INDEX } from '../../../../common/endpoint/constants';
import type { DeepMutable } from '../../../../common/endpoint/types/utility_types';
import { set } from 'lodash';

jest.mock('../../services/actions/action_details_by_id', () => {
  const original = jest.requireActual('../../services/actions/action_details_by_id');

  return {
    ...original,
    getActionDetailsById: jest.fn(original.getActionDetailsById),
  };
});

const getActionDetailsByIdMock = _getActionDetailsById as jest.Mock;

describe('`ResponseActionsClientImpl` class', () => {
  let esClient: ElasticsearchClientMock;
  let endpointAppContextService: EndpointAppContextService;
  let baseClassMock: MockClassWithExposedProtectedMembers;
  let casesClient: CasesClientMock;
  let logger: Logger;

  beforeEach(async () => {
    esClient = elasticsearchServiceMock.createScopedClusterClient().asInternalUser;
    casesClient = createCasesClientMock();

    endpointAppContextService = new EndpointAppContextService();
    endpointAppContextService.setup(createMockEndpointAppContextServiceSetupContract());
    endpointAppContextService.start(createMockEndpointAppContextServiceStartContract());

    logger = endpointAppContextService.createLogger();
    baseClassMock = new MockClassWithExposedProtectedMembers({
      esClient,
      casesClient,
      endpointService: endpointAppContextService,
      username: 'foo',
    });
  });

  afterEach(() => {
    getActionDetailsByIdMock.mockClear();
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

    let updateCasesOptions: Required<ResponseActionsClientUpdateCasesOptions>;

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

      updateCasesOptions = {
        command: 'isolate',
        caseIds: ['case-999'],
        alertIds: [KNOWN_ALERT_ID_1, KNOWN_ALERT_ID_2, KNOWN_ALERT_ID_3],
        comment: 'this is a case comment',
        hosts: [
          {
            hostId: '1-2-3',
            hostname: 'foo-one',
          },
          {
            hostId: '4-5-6',
            hostname: 'foo-two',
          },
        ],
      };
    });

    it('should do nothing if no caseIds nor alertIds are provided', async () => {
      updateCasesOptions.caseIds.length = 0;
      updateCasesOptions.alertIds.length = 0;
      await baseClassMock.updateCases(updateCasesOptions);

      expect(casesClient.cases.getCasesByAlertID).not.toHaveBeenCalled();
      expect(casesClient.attachments.bulkCreate).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(
        "Nothing to do. 'caseIds' and 'alertIds' are empty"
      );
    });

    it('should do nothing if no hosts were provided', async () => {
      updateCasesOptions.hosts.length = 0;
      await baseClassMock.updateCases(updateCasesOptions);

      expect(casesClient.cases.getCasesByAlertID).not.toHaveBeenCalled();
      expect(casesClient.attachments.bulkCreate).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith("Nothing to do. 'hosts' is empty");
    });

    it('should do nothing if cases client was not provided', async () => {
      const mockInstance = new MockClassWithExposedProtectedMembers({
        esClient,
        endpointService: endpointAppContextService,
        username: 'foo',
      });
      await mockInstance.updateCases(updateCasesOptions);

      expect(casesClient.cases.getCasesByAlertID).not.toHaveBeenCalled();
      expect(casesClient.attachments.bulkCreate).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(
        'No CasesClient available. Skipping updates to Cases!'
      );
    });

    it('should retrieve caseIds from alerts if alertIds was provided', async () => {
      await baseClassMock.updateCases(updateCasesOptions);

      expect(casesClient.cases.getCasesByAlertID).toHaveBeenCalledTimes(3);
    });

    it('should not error is retrieving case id for alert fails', async () => {
      updateCasesOptions.alertIds.push('invalid-alert-id');
      await baseClassMock.updateCases(updateCasesOptions);

      expect(casesClient.cases.getCasesByAlertID).toHaveBeenCalledTimes(4);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Attempt to get cases for alertID [invalid-alert-id]')
      );
    });

    it('should do nothing if alertIDs were not associated with any cases', async () => {
      updateCasesOptions.caseIds.length = 0;
      updateCasesOptions.alertIds = [KNOWN_ALERT_ID_3];
      await baseClassMock.updateCases(updateCasesOptions);

      expect(logger.debug).toHaveBeenCalledWith(`Nothing to do. Alert IDs are not tied to Cases`);
    });

    it('should update cases with an attachment for each host', async () => {
      const updateResponse = await baseClassMock.updateCases(updateCasesOptions);

      expect(updateResponse).toBeUndefined();
      expect(casesClient.attachments.bulkCreate).toHaveBeenCalledTimes(4);
      expect(casesClient.attachments.bulkCreate).toHaveBeenLastCalledWith({
        attachments: [
          {
            actions: {
              targets: [
                {
                  endpointId: '1-2-3',
                  hostname: 'foo-one',
                },
                {
                  endpointId: '4-5-6',
                  hostname: 'foo-two',
                },
              ],
              type: 'isolate',
            },
            comment: 'this is a case comment',
            owner: 'securitySolution',
            type: 'actions',
          },
          {
            actions: {
              targets: [
                {
                  endpointId: '1-2-3',
                  hostname: 'foo-one',
                },
                {
                  endpointId: '4-5-6',
                  hostname: 'foo-two',
                },
              ],
              type: 'isolate',
            },
            comment: 'this is a case comment',
            owner: 'securitySolution',
            type: 'actions',
          },
          {
            actions: {
              targets: [
                {
                  endpointId: '1-2-3',
                  hostname: 'foo-one',
                },
                {
                  endpointId: '4-5-6',
                  hostname: 'foo-two',
                },
              ],
              type: 'isolate',
            },
            comment: 'this is a case comment',
            owner: 'securitySolution',
            type: 'actions',
          },
          {
            actions: {
              targets: [
                {
                  endpointId: '1-2-3',
                  hostname: 'foo-one',
                },
                {
                  endpointId: '4-5-6',
                  hostname: 'foo-two',
                },
              ],
              type: 'isolate',
            },
            comment: 'this is a case comment',
            owner: 'securitySolution',
            type: 'actions',
          },
        ],
        caseId: 'case-3',
      });
    });

    it('should not error if update to a case fails', async () => {
      (casesClient.attachments.bulkCreate as jest.Mock).mockImplementation(async (options) => {
        if (options.caseId === 'case-2') {
          throw new Error('update filed to case-2');
        }
      });
      await baseClassMock.updateCases(updateCasesOptions);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Attempt to update case ID [case-2] failed:')
      );
    });
  });

  describe('#fetchActionDetails()', () => {
    it('should retrieve action details', async () => {
      await baseClassMock.fetchActionDetails('one').catch(() => {
        // just ignoring error
      });

      expect(getActionDetailsByIdMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'one'
      );
    });
  });

  describe('#writeActionRequestToEndpointIndex()', () => {
    let esIndexDocResponse: TransportResult<estypes.IndexResponse, unknown>;
    let indexDocOptions: DeepMutable<ResponseActionsClientWriteActionRequestToEndpointIndexOptions>;
    let expectedIndexDoc: LogsEndpointAction;

    beforeEach(() => {
      esIndexDocResponse = {
        body: {
          result: 'created',
          _id: '123',
          _index: ENDPOINT_ACTIONS_INDEX,
          _version: 1,
        },
        statusCode: 201,
        headers: {},
        meta: {},
        warnings: null,
      } as TransportResult<estypes.IndexResponse, unknown>;

      indexDocOptions = {
        command: 'isolate',
        rule_name: 'my-rule',
        rule_id: 'rule-1',
        agent_type: 'endpoint',
        endpoint_ids: ['one'],
        comment: 'test comment',
        alert_ids: undefined,
        case_ids: undefined,
        hosts: undefined,
        parameters: undefined,
        file: undefined,
      };

      expectedIndexDoc = {
        '@timestamp': expect.any(String),
        EndpointActions: {
          action_id: expect.any(String),
          data: {
            command: 'isolate',
            comment: 'test comment',
          },
          expiration: expect.any(String),
          input_type: 'endpoint',
          type: 'INPUT_ACTION',
        },
        agent: {
          id: ['one'],
        },
        rule: {
          id: 'rule-1',
          name: 'my-rule',
        },
        user: {
          id: 'foo',
        },
      };

      esClient.index.mockReturnValue(Promise.resolve(esIndexDocResponse));
    });

    it('should return indexed record on success', async () => {
      await expect(
        baseClassMock.writeActionRequestToEndpointIndex(indexDocOptions)
      ).resolves.toEqual(expectedIndexDoc);
    });

    it('should include alert_ids if any were provided', async () => {
      indexDocOptions.alert_ids = ['one', 'two'];
      set(expectedIndexDoc, 'EndpointActions.data.alert_id', indexDocOptions.alert_ids);

      await expect(
        baseClassMock.writeActionRequestToEndpointIndex(indexDocOptions)
      ).resolves.toEqual(expectedIndexDoc);
    });

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
  public async updateCases(options: ResponseActionsClientUpdateCasesOptions): Promise<void> {
    return super.updateCases(options);
  }

  public async fetchActionDetails<T extends ActionDetails = ActionDetails>(
    actionId: string
  ): Promise<T> {
    return super.fetchActionDetails(actionId);
  }

  public async writeActionRequestToEndpointIndex(
    actionRequest: ResponseActionsClientWriteActionRequestToEndpointIndexOptions
  ): Promise<LogsEndpointAction> {
    return super.writeActionRequestToEndpointIndex(actionRequest);
  }

  public async writeActionResponseToEndpointIndex<TOutputContent extends object = object>(
    options: ResponseActionsClientWriteActionResponseToEndpointIndexOptions<TOutputContent>
  ): Promise<LogsEndpointActionResponse<TOutputContent>> {
    return super.writeActionResponseToEndpointIndex<TOutputContent>(options);
  }
}
