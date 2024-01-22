/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line max-classes-per-file
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
  EndpointActionResponseDataOutput,
} from '../../../../../../common/endpoint/types';
import type { EndpointAppContextService } from '../../../../endpoint_app_context_services';
import type { ElasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { ResponseActionsClientError, ResponseActionsNotSupportedError } from '../errors';
import type { CasesClientMock } from '@kbn/cases-plugin/server/client/mocks';
import type { CasesByAlertIDParams } from '@kbn/cases-plugin/server/client/cases/get';
import type { Logger } from '@kbn/logging';
import { getActionDetailsById as _getActionDetailsById } from '../../action_details_by_id';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { TransportResult } from '@elastic/elasticsearch';
import { ENDPOINT_ACTIONS_INDEX } from '../../../../../../common/endpoint/constants';
import type { DeepMutable } from '../../../../../../common/endpoint/types/utility_types';
import { set } from 'lodash';
import { responseActionsClientMock } from '../mocks';
import type { ResponseActionAgentType } from '../../../../../../common/endpoint/service/response_actions/constants';
import { getResponseActionFeatureKey } from '../../../feature_usage/feature_keys';

jest.mock('../../action_details_by_id', () => {
  const original = jest.requireActual('../../action_details_by_id');

  return {
    ...original,
    getActionDetailsById: jest.fn(original.getActionDetailsById),
  };
});

const getActionDetailsByIdMock = _getActionDetailsById as jest.Mock;

describe('ResponseActionsClientImpl base class', () => {
  let constructorOptions: ReturnType<typeof responseActionsClientMock.createConstructorOptions>;
  let esClient: ElasticsearchClientMock;
  let endpointAppContextService: EndpointAppContextService;
  let baseClassMock: MockClassWithExposedProtectedMembers;
  let casesClient: CasesClientMock;
  let logger: Logger;

  beforeEach(async () => {
    constructorOptions = responseActionsClientMock.createConstructorOptions();

    esClient = constructorOptions.esClient;
    casesClient = constructorOptions.casesClient;
    endpointAppContextService = constructorOptions.endpointService;
    logger = endpointAppContextService.createLogger();
    baseClassMock = new MockClassWithExposedProtectedMembers(constructorOptions);
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
      const responsePromise = baseClassMock[method]({});

      await expect(responsePromise).rejects.toBeInstanceOf(ResponseActionsNotSupportedError);
      await expect(responsePromise).rejects.toHaveProperty('statusCode', 405);
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
        agent_type: 'endpoint',
        endpoint_ids: ['one'],
        comment: 'test comment',
        rule_name: undefined,
        rule_id: undefined,
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
        user: {
          id: 'foo',
        },
      };

      // @ts-expect-error TS2345: Argument of type... Due to the fact that the method definition is overloaded
      esClient.index.mockResolvedValue(esIndexDocResponse);
    });

    it('should return indexed record on success', async () => {
      await expect(
        baseClassMock.writeActionRequestToEndpointIndex(indexDocOptions)
      ).resolves.toEqual(expectedIndexDoc);

      expect(endpointAppContextService.getFeatureUsageService().notifyUsage).toHaveBeenCalledWith(
        getResponseActionFeatureKey(indexDocOptions.command)
      );
    });

    it('should notify feature usage', async () => {
      await baseClassMock.writeActionRequestToEndpointIndex(indexDocOptions);

      expect(endpointAppContextService.getFeatureUsageService().notifyUsage).toHaveBeenCalledWith(
        getResponseActionFeatureKey(indexDocOptions.command)
      );
    });

    it('should set `EndpointActions.input_type` to the correct value', async () => {
      const baseClassMock2 = new (class extends MockClassWithExposedProtectedMembers {
        protected readonly agentType = 'sentinel_one';
      })(constructorOptions);
      indexDocOptions.agent_type = 'sentinel_one';
      set(expectedIndexDoc, 'EndpointActions.input_type', 'sentinel_one');

      await expect(
        baseClassMock2.writeActionRequestToEndpointIndex(indexDocOptions)
      ).resolves.toEqual(expectedIndexDoc);
    });

    it('should include alert_ids if any were provided', async () => {
      indexDocOptions.alert_ids = ['one', 'two'];
      set(expectedIndexDoc, 'EndpointActions.data.alert_id', indexDocOptions.alert_ids);

      await expect(
        baseClassMock.writeActionRequestToEndpointIndex(indexDocOptions)
      ).resolves.toEqual(expectedIndexDoc);
    });

    it('should include hosts if any where provided', async () => {
      indexDocOptions.hosts = { hostA: { name: 'host a' } };
      set(expectedIndexDoc, 'EndpointActions.data.hosts', indexDocOptions.hosts);

      await expect(
        baseClassMock.writeActionRequestToEndpointIndex(indexDocOptions)
      ).resolves.toEqual(expectedIndexDoc);
    });

    it('should include Rule information if rule_id and rule_name were provided', async () => {
      indexDocOptions.rule_id = '1-2-3';
      indexDocOptions.rule_name = 'rule 123';
      expectedIndexDoc.rule = {
        name: indexDocOptions.rule_name,
        id: indexDocOptions.rule_id,
      };

      await expect(
        baseClassMock.writeActionRequestToEndpointIndex(indexDocOptions)
      ).resolves.toEqual(expectedIndexDoc);
    });

    it('should NOT include Rule information if rule_id or rule_name are missing', async () => {
      indexDocOptions.rule_id = '1-2-3';

      await expect(
        baseClassMock.writeActionRequestToEndpointIndex(indexDocOptions)
      ).resolves.toEqual(expectedIndexDoc);
    });

    it('should error if index of document did not return a 201', async () => {
      esIndexDocResponse.statusCode = 200;
      const responsePromise = baseClassMock.writeActionRequestToEndpointIndex(indexDocOptions);

      await expect(responsePromise).rejects.toBeInstanceOf(ResponseActionsClientError);
      await expect(responsePromise).rejects.toHaveProperty('statusCode', 500);
    });

    it('should throw ResponseActionsClientError if operation fails', async () => {
      esClient.index.mockImplementation(async () => {
        throw new Error('test error');
      });
      const responsePromise = baseClassMock.writeActionRequestToEndpointIndex(indexDocOptions);

      await expect(responsePromise).rejects.toBeInstanceOf(ResponseActionsClientError);
      await expect(responsePromise).rejects.toHaveProperty('statusCode', 500);
      await expect(responsePromise).rejects.toHaveProperty(
        'message',
        expect.stringContaining('Failed to create action request document:')
      );
    });
  });

  describe('#writeActionResponseToEndpointIndex()', () => {
    let actionResponseOptions: ResponseActionsClientWriteActionResponseToEndpointIndexOptions;

    beforeEach(() => {
      actionResponseOptions = {
        actionId: '1-2-3',
        agentId: '123',
        error: { message: 'test error' },
        data: {
          command: 'isolate',
          comment: 'some comment',
          output: undefined,
        },
      };
    });

    it('should return indexed record on success', async () => {
      await expect(
        baseClassMock.writeActionResponseToEndpointIndex(actionResponseOptions)
      ).resolves.toEqual({
        '@timestamp': expect.any(String),
        EndpointActions: {
          action_id: '1-2-3',
          input_type: 'endpoint',
          completed_at: expect.any(String),
          started_at: expect.any(String),
          data: {
            command: 'isolate',
            comment: 'some comment',
            output: undefined,
          },
        },
        agent: {
          id: '123',
        },
        error: {
          message: 'test error',
        },
      } as LogsEndpointActionResponse);
    });

    it('should throw ResponseActionsClientError if operation fails', async () => {
      esClient.index.mockImplementation(async () => {
        throw new Error('oh oh');
      });
      const responsePromise =
        baseClassMock.writeActionResponseToEndpointIndex(actionResponseOptions);

      await expect(responsePromise).rejects.toBeInstanceOf(ResponseActionsClientError);
      await expect(responsePromise).rejects.toHaveProperty(
        'message',
        expect.stringContaining('Failed to create action response document: ')
      );
      await expect(responsePromise).rejects.toHaveProperty('statusCode', 500);
    });
  });
});

class MockClassWithExposedProtectedMembers extends ResponseActionsClientImpl {
  protected readonly agentType: ResponseActionAgentType = 'endpoint';

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

  public async writeActionResponseToEndpointIndex<
    TOutputContent extends EndpointActionResponseDataOutput = EndpointActionResponseDataOutput
  >(
    options: ResponseActionsClientWriteActionResponseToEndpointIndexOptions<TOutputContent>
  ): Promise<LogsEndpointActionResponse<TOutputContent>> {
    return super.writeActionResponseToEndpointIndex<TOutputContent>(options);
  }
}
