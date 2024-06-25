/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResponseActionsClientOptions } from '../lib/base_response_actions_client';
import type { ResponseActionsClient } from '../../..';
import { EndpointActionsClient } from '../../..';
import { endpointActionClientMock } from './mocks';
import { responseActionsClientMock } from '../mocks';
import { ENDPOINT_ACTIONS_INDEX } from '../../../../../../common/endpoint/constants';
import type { ResponseActionRequestBody } from '../../../../../../common/endpoint/types';
import { DEFAULT_EXECUTE_ACTION_TIMEOUT } from '../../../../../../common/endpoint/service/response_actions/constants';
import { applyEsClientSearchMock } from '../../../../mocks/utils.mock';
import type { ElasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { BaseDataGenerator } from '../../../../../../common/endpoint/data_generators/base_data_generator';
import { Readable } from 'stream';

describe('EndpointActionsClient', () => {
  let classConstructorOptions: ResponseActionsClientOptions;
  let endpointActionsClient: ResponseActionsClient;

  const getCommonResponseActionOptions = (): Pick<
    ResponseActionRequestBody,
    'endpoint_ids' | 'case_ids'
  > => {
    return {
      endpoint_ids: ['1-2-3', 'invalid-id'],
      case_ids: ['case-a'],
    };
  };

  beforeEach(() => {
    classConstructorOptions = endpointActionClientMock.createConstructorOptions();
    endpointActionsClient = new EndpointActionsClient(classConstructorOptions);
  });

  it('should validate endpoint ids and log those that are invalid', async () => {
    await endpointActionsClient.isolate(
      responseActionsClientMock.createIsolateOptions(getCommonResponseActionOptions())
    );

    expect(classConstructorOptions.endpointService.createLogger().debug).toHaveBeenCalledWith(
      'The following agent ids are not valid: ["invalid-id"]'
    );
  });

  it('should sign fleet action request document', async () => {
    await endpointActionsClient.isolate(
      responseActionsClientMock.createIsolateOptions(getCommonResponseActionOptions())
    );

    expect(
      classConstructorOptions.endpointService.getMessageSigningService().sign as jest.Mock
    ).toHaveBeenCalled();
  });

  it('should only dispatch fleet action for valid IDs', async () => {
    await endpointActionsClient.isolate(
      responseActionsClientMock.createIsolateOptions(getCommonResponseActionOptions())
    );

    expect(
      (await classConstructorOptions.endpointService.getFleetActionsClient()).create as jest.Mock
    ).toHaveBeenCalledWith({
      '@timestamp': expect.any(String),
      action_id: expect.any(String),
      agents: ['1-2-3'],
      data: {
        command: 'isolate',
        parameters: undefined,
        comment: 'test comment',
      },
      expiration: expect.any(String),
      input_type: 'endpoint',
      signed: {
        data: expect.any(String),
        signature: 'thisisasignature',
      },
      timeout: 300,
      type: 'INPUT_ACTION',
      user_id: 'foo',
    });
  });

  it('should write action request document', async () => {
    await endpointActionsClient.isolate(
      responseActionsClientMock.createIsolateOptions(getCommonResponseActionOptions())
    );

    expect(classConstructorOptions.esClient.index).toHaveBeenCalledWith(
      {
        index: ENDPOINT_ACTIONS_INDEX,
        document: {
          '@timestamp': expect.any(String),
          EndpointActions: {
            action_id: expect.any(String),
            data: {
              command: 'isolate',
              comment: 'test comment',
              parameters: undefined,
            },
            expiration: expect.any(String),
            input_type: 'endpoint',
            type: 'INPUT_ACTION',
          },
          agent: {
            id: ['1-2-3', 'invalid-id'],
          },
          user: {
            id: 'foo',
          },
        },
        refresh: 'wait_for',
      },
      expect.anything()
    );
  });

  it('should update cases', async () => {
    await endpointActionsClient.isolate(
      responseActionsClientMock.createIsolateOptions(getCommonResponseActionOptions())
    );

    expect(classConstructorOptions.casesClient?.attachments.bulkCreate).toHaveBeenCalledWith({
      attachments: [
        {
          externalReferenceAttachmentTypeId: 'endpoint',
          externalReferenceId: expect.any(String),
          externalReferenceMetadata: {
            command: 'isolate',
            comment: 'test comment',
            targets: [
              {
                agentType: 'endpoint',
                endpointId: '1-2-3',
                hostname: 'Host-ku5jy6j0pw',
              },
              {
                agentType: 'endpoint',
                endpointId: 'invalid-id',
                hostname: '',
              },
            ],
          },
          externalReferenceStorage: {
            type: 'elasticSearchDoc',
          },
          owner: 'securitySolution',
          type: 'externalReference',
        },
      ],
      caseId: 'case-a',
    });
  });

  it('should create an action with error', async () => {
    await endpointActionsClient.isolate(getCommonResponseActionOptions(), {
      error: 'something is wrong',
    });

    expect(
      (await classConstructorOptions.endpointService.getFleetActionsClient()).create as jest.Mock
    ).not.toHaveBeenCalled();
    expect(classConstructorOptions.esClient.index).toHaveBeenCalledWith(
      expect.objectContaining({
        document: expect.objectContaining({
          error: {
            message: 'something is wrong',
          },
        }),
      }),
      { meta: true }
    );
  });
  it('should create an action with error when agents are invalid', async () => {
    // @ts-expect-error mocking this for testing purposes
    endpointActionsClient.checkAgentIds = jest.fn().mockResolvedValueOnce({
      isValid: false,
      valid: [],
      invalid: ['invalid-id'],
      hosts: [{ agent: { id: 'invalid-id', name: '' }, host: { hostname: '' } }],
    });

    await endpointActionsClient.isolate(getCommonResponseActionOptions());

    expect(
      (await classConstructorOptions.endpointService.getFleetActionsClient()).create as jest.Mock
    ).not.toHaveBeenCalled();
    expect(classConstructorOptions.esClient.index).toHaveBeenCalledWith(
      expect.objectContaining({
        document: expect.objectContaining({
          error: {
            message: 'The host does not have Elastic Defend integration installed',
          },
        }),
      }),
      { meta: true }
    );
  });

  it('should return ActionDetails for newly created action', async () => {
    const actionResponse = await endpointActionsClient.isolate(
      responseActionsClientMock.createIsolateOptions(getCommonResponseActionOptions())
    );

    // NOTE: checking only the keys in order to avoid confusion - because the use of Mocks would
    // have returned a action details that would not match the request sent in this test.
    await expect(Object.keys(actionResponse)).toEqual([
      'action',
      'id',
      'agentType',
      'agents',
      'hosts',
      'command',
      'startedAt',
      'isCompleted',
      'completedAt',
      'wasSuccessful',
      'errors',
      'isExpired',
      'status',
      'outputs',
      'agentState',
      'createdBy',
      'comment',
      'parameters',
      'alertIds',
      'ruleId',
      'ruleName',
    ]);
  });

  type ResponseActionsMethodsOnly = keyof Omit<
    ResponseActionsClient,
    'processPendingActions' | 'getFileDownload' | 'getFileInfo'
  >;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const responseActionMethods: Record<ResponseActionsMethodsOnly, any> = {
    isolate: responseActionsClientMock.createIsolateOptions(getCommonResponseActionOptions()),

    release: responseActionsClientMock.createReleaseOptions(getCommonResponseActionOptions()),

    killProcess: responseActionsClientMock.createKillProcessOptions(
      getCommonResponseActionOptions()
    ),

    suspendProcess: responseActionsClientMock.createSuspendProcessOptions(
      getCommonResponseActionOptions()
    ),

    runningProcesses: responseActionsClientMock.createRunningProcessesOptions(
      getCommonResponseActionOptions()
    ),

    getFile: responseActionsClientMock.createGetFileOptions(getCommonResponseActionOptions()),

    execute: responseActionsClientMock.createExecuteOptions(getCommonResponseActionOptions()),

    upload: responseActionsClientMock.createUploadOptions(getCommonResponseActionOptions()),

    scan: responseActionsClientMock.createScanOptions(getCommonResponseActionOptions()),
  };

  it.each(Object.keys(responseActionMethods) as ResponseActionsMethodsOnly[])(
    'should dispatch a fleet action request calling %s() method',
    async (methodName) => {
      await endpointActionsClient[methodName](responseActionMethods[methodName]);

      let expectedParams = responseActionMethods[methodName].parameters;

      switch (methodName) {
        case 'upload':
          expectedParams = {
            ...expectedParams,
            file_id: '123-456-789',
            file_name: 'foo.txt',
            file_sha256: '96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3',
            file_size: 45632,
          };
          break;

        case 'execute':
          expectedParams = {
            ...expectedParams,
            timeout: DEFAULT_EXECUTE_ACTION_TIMEOUT,
          };
          break;
      }

      expect(
        (await classConstructorOptions.endpointService.getFleetActionsClient()).create as jest.Mock
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            command: expect.any(String),
            comment: 'test comment',
            parameters: expectedParams,
          },
        })
      );
    }
  );

  describe('#getFileDownload()', () => {
    it('should throw error if agent type for the action id is not endpoint', async () => {
      applyEsClientSearchMock({
        esClientMock: classConstructorOptions.esClient as ElasticsearchClientMock,
        index: ENDPOINT_ACTIONS_INDEX,
        response: BaseDataGenerator.toEsSearchResponse([]),
      });

      await expect(endpointActionsClient.getFileDownload('abc', '123')).rejects.toThrow(
        'Action id [abc] not found with an agent type of [endpoint]'
      );
    });

    it('should throw error if file id not associated with action id', async () => {
      await expect(endpointActionsClient.getFileDownload('abc', '123')).rejects.toThrow(
        'Invalid file id [123] for action [abc]'
      );
    });

    it('should return expected response', async () => {
      await expect(
        endpointActionsClient.getFileDownload('321-654', '123-456-789')
      ).resolves.toEqual({
        stream: expect.any(Readable),
        fileName: expect.any(String),
        mimeType: expect.any(String),
      });
    });
  });

  describe('#getFileInfo()', () => {
    it('should throw error if agent type for the action id is not endpoint', async () => {
      applyEsClientSearchMock({
        esClientMock: classConstructorOptions.esClient as ElasticsearchClientMock,
        index: ENDPOINT_ACTIONS_INDEX,
        response: BaseDataGenerator.toEsSearchResponse([]),
      });

      await expect(endpointActionsClient.getFileInfo('abc', '123')).rejects.toThrow(
        'Action id [abc] not found with an agent type of [endpoint]'
      );
    });

    it('should throw error if file id not associated with action id', async () => {
      await expect(endpointActionsClient.getFileInfo('abc', '123')).rejects.toThrow(
        'Invalid file ID. File [123] not associated with action ID [abc]'
      );
    });

    it('should return expected response', async () => {
      await expect(endpointActionsClient.getFileInfo('321-654', '123-456-789')).resolves.toEqual({
        actionId: '321-654',
        agentId: '111-222',
        agentType: 'endpoint',
        created: '2023-05-12T19:47:33.702Z',
        id: '123-456-789',
        mimeType: 'text/plain',
        name: 'foo.txt',
        size: 45632,
        status: 'READY',
      });
    });
  });
});
