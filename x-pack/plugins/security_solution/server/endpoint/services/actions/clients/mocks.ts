/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClientMock } from '@kbn/actions-plugin/server/actions_client/actions_client.mock';
import { actionsClientMock } from '@kbn/actions-plugin/server/actions_client/actions_client.mock';
import type { ConnectorWithExtraFindData } from '@kbn/actions-plugin/server/application/connector/types';
import type { DeepPartial } from 'utility-types';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import type { ElasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import type { CasesClientMock } from '@kbn/cases-plugin/server/client/mocks';
import { createCasesClientMock } from '@kbn/cases-plugin/server/client/mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { merge } from 'lodash';
import type * as esTypes from '@elastic/elasticsearch/lib/api/types';
import type { TransportResult } from '@elastic/elasticsearch';
import type { AttachmentsSubClient } from '@kbn/cases-plugin/server/client/attachments/client';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { DeeplyMockedKeys } from '@kbn/utility-types-jest';

import type { ResponseActionsClient } from '../..';
import { NormalizedExternalConnectorClient } from '../..';
import type { KillOrSuspendProcessRequestBody } from '../../../../../common/endpoint/types';
import { BaseDataGenerator } from '../../../../../common/endpoint/data_generators/base_data_generator';
import {
  createActionRequestsEsSearchResultsMock,
  createActionResponsesEsSearchResultsMock,
  createHapiReadableStreamMock,
} from '../mocks';
import {
  ENDPOINT_ACTION_RESPONSES_INDEX,
  ENDPOINT_ACTIONS_INDEX,
} from '../../../../../common/endpoint/constants';
import type { DeepMutable } from '../../../../../common/endpoint/types/utility_types';
import { EndpointAppContextService } from '../../../endpoint_app_context_services';
import {
  createMockEndpointAppContextServiceSetupContract,
  createMockEndpointAppContextServiceStartContract,
} from '../../../mocks';
import type { ResponseActionsClientOptions } from './lib/base_response_actions_client';
import { ACTION_RESPONSE_INDICES } from '../constants';
import type {
  ExecuteActionRequestBody,
  GetProcessesRequestBody,
  IsolationRouteRequestBody,
  ResponseActionGetFileRequestBody,
  UploadActionApiRequestBody,
  ScanActionRequestBody,
} from '../../../../../common/api/endpoint';

export interface ResponseActionsClientOptionsMock extends ResponseActionsClientOptions {
  esClient: ElasticsearchClientMock;
  casesClient?: CasesClientMock;
}

const createResponseActionClientMock = (): jest.Mocked<ResponseActionsClient> => {
  return {
    suspendProcess: jest.fn().mockReturnValue(Promise.resolve()),
    upload: jest.fn().mockReturnValue(Promise.resolve()),
    getFile: jest.fn().mockReturnValue(Promise.resolve()),
    execute: jest.fn().mockReturnValue(Promise.resolve()),
    killProcess: jest.fn().mockReturnValue(Promise.resolve()),
    isolate: jest.fn().mockReturnValue(Promise.resolve()),
    release: jest.fn().mockReturnValue(Promise.resolve()),
    runningProcesses: jest.fn().mockReturnValue(Promise.resolve()),
    processPendingActions: jest.fn().mockReturnValue(Promise.resolve()),
    getFileInfo: jest.fn().mockReturnValue(Promise.resolve()),
    getFileDownload: jest.fn().mockReturnValue(Promise.resolve()),
    scan: jest.fn().mockReturnValue(Promise.resolve()),
  };
};

const createConstructorOptionsMock = (): Required<ResponseActionsClientOptionsMock> => {
  const esClient = elasticsearchServiceMock.createScopedClusterClient().asInternalUser;
  const casesClient = createCasesClientMock();
  const endpointService = new EndpointAppContextService();

  esClient.index.mockImplementation((async (payload) => {
    switch (payload.index) {
      case ENDPOINT_ACTIONS_INDEX:
      case ENDPOINT_ACTION_RESPONSES_INDEX:
        return createEsIndexTransportResponseMock({ body: { _index: payload.index } });
      default:
        throw new Error(`no esClient.index() mock defined for index ${payload.index}`);
    }
  }) as typeof esClient.index);

  esClient.search.mockImplementation(async (payload) => {
    if (payload) {
      switch (payload.index) {
        case ENDPOINT_ACTIONS_INDEX:
          return createActionRequestsEsSearchResultsMock();
        case ACTION_RESPONSE_INDICES:
          return createActionResponsesEsSearchResultsMock();
      }
    }

    return BaseDataGenerator.toEsSearchResponse([]);
  });

  (casesClient.attachments.bulkCreate as jest.Mock).mockImplementation(
    (async () => {}) as unknown as jest.Mocked<AttachmentsSubClient>['bulkCreate']
  );

  endpointService.setup(createMockEndpointAppContextServiceSetupContract());
  endpointService.start(createMockEndpointAppContextServiceStartContract());

  return {
    esClient,
    casesClient,
    endpointService,
    username: 'foo',
    isAutomated: false,
  };
};

const createEsIndexTransportResponseMock = (
  overrides: DeepPartial<TransportResult<esTypes.IndexResponse, unknown>> = {}
): TransportResult<esTypes.IndexResponse, unknown> => {
  const responseDoc: TransportResult<esTypes.IndexResponse, unknown> = {
    body: {
      _id: 'indexed-1-2-3',
      _index: 'some-index',
      _primary_term: 1,
      result: 'created',
      _seq_no: 1,
      _shards: {
        failed: 0,
        successful: 1,
        total: 1,
      },
      _version: 1,
    },
    statusCode: 201,
    headers: {},
    warnings: null,
    meta: {
      context: {},
      name: 'foo',
      request: {
        params: {
          method: 'GET',
          path: 'some/path',
        },
        options: {},
        id: 'some-id',
      },
      connection: null,
      attempts: 1,
      aborted: false,
    },
  };

  return merge(responseDoc, overrides);
};

const createNoParamsResponseActionOptionsMock = (
  overrides: Partial<IsolationRouteRequestBody> = {}
): DeepMutable<IsolationRouteRequestBody> => {
  const isolateOptions: IsolationRouteRequestBody = {
    agent_type: 'endpoint',
    endpoint_ids: ['1-2-3'],
    comment: 'test comment',
  };

  return merge(isolateOptions, overrides);
};

const createKillOrSuspendProcessOptionsMock = (
  overrides: Partial<KillOrSuspendProcessRequestBody> = {}
): KillOrSuspendProcessRequestBody => {
  const options: KillOrSuspendProcessRequestBody = {
    ...createNoParamsResponseActionOptionsMock(),
    parameters: {
      pid: 999,
    },
  };
  return merge(options, overrides);
};

const createRunningProcessesOptionsMock = (
  overrides: Partial<GetProcessesRequestBody> = {}
): GetProcessesRequestBody => {
  return createNoParamsResponseActionOptionsMock(overrides);
};

const createGetFileOptionsMock = (
  overrides: Partial<ResponseActionGetFileRequestBody> = {}
): ResponseActionGetFileRequestBody => {
  const options: ResponseActionGetFileRequestBody = {
    ...createNoParamsResponseActionOptionsMock(),
    parameters: {
      path: '/some/file',
    },
  };
  return merge(options, overrides);
};

const createExecuteOptionsMock = (
  overrides: Partial<ExecuteActionRequestBody> = {}
): ExecuteActionRequestBody => {
  const options: ExecuteActionRequestBody = {
    ...createNoParamsResponseActionOptionsMock(),
    parameters: {
      command: 'ls -ltr',
    },
  };

  return merge(options, overrides);
};

const createUploadOptionsMock = (
  overrides: Partial<UploadActionApiRequestBody> = {}
): UploadActionApiRequestBody => {
  const options: UploadActionApiRequestBody = {
    ...createNoParamsResponseActionOptionsMock(),
    parameters: {
      overwrite: true,
    },
    file: createHapiReadableStreamMock(),
  };

  return merge(options, overrides);
};

const createScanOptionsMock = (
  overrides: Partial<ScanActionRequestBody> = {}
): ScanActionRequestBody => {
  const options: ScanActionRequestBody = {
    ...createNoParamsResponseActionOptionsMock(),
    parameters: {
      path: '/scan/folder',
    },
  };
  return merge(options, overrides);
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

const createConnectorActionExecuteResponseMock = <TData>(
  overrides: DeepPartial<ActionTypeExecutorResult<TData>> = {}
): ActionTypeExecutorResult<{}> => {
  const result: ActionTypeExecutorResult<TData> = {
    actionId: 'execute-response-mock-1',
    data: undefined,
    message: 'some mock message',
    serviceMessage: 'some mock service message',
    retry: true,
    status: 'ok',
  };

  // @ts-expect-error upgrade typescript v4.9.5
  return merge(result, overrides);
};

const createConnectorActionsClientMock = ({
  getAllResponse,
}: {
  getAllResponse?: ConnectorWithExtraFindData[];
} = {}): ActionsClientMock => {
  const client = actionsClientMock.create();

  (client.getAll as jest.Mock).mockImplementation(async () => {
    return getAllResponse ?? [];
  });

  return client;
};

const createNormalizedExternalConnectorClientMock = (
  connectorActionsClientMock: ActionsClientMock = createConnectorActionsClientMock()
): DeeplyMockedKeys<NormalizedExternalConnectorClient> => {
  const normalizedClient = new NormalizedExternalConnectorClient(
    connectorActionsClientMock,
    loggingSystemMock.createLogger()
  );

  jest.spyOn(normalizedClient, 'execute');
  jest.spyOn(normalizedClient, 'setup');

  return normalizedClient as DeeplyMockedKeys<NormalizedExternalConnectorClient>;
};

export const responseActionsClientMock = Object.freeze({
  create: createResponseActionClientMock,
  createConstructorOptions: createConstructorOptionsMock,

  createIsolateOptions: createNoParamsResponseActionOptionsMock,
  createReleaseOptions: createNoParamsResponseActionOptionsMock,
  createKillProcessOptions: createKillOrSuspendProcessOptionsMock,
  createSuspendProcessOptions: createKillOrSuspendProcessOptionsMock,
  createRunningProcessesOptions: createRunningProcessesOptionsMock,
  createGetFileOptions: createGetFileOptionsMock,
  createExecuteOptions: createExecuteOptionsMock,
  createUploadOptions: createUploadOptionsMock,
  createScanOptions: createScanOptionsMock,

  createIndexedResponse: createEsIndexTransportResponseMock,

  createNormalizedExternalConnectorClient: createNormalizedExternalConnectorClientMock,

  // Some common mocks when working with connector actions client (actions plugin)
  createConnectorActionsClient: createConnectorActionsClientMock,
  /** Create a mock connector instance */
  createConnector: createConnectorMock,
  createConnectorActionExecuteResponse: createConnectorActionExecuteResponseMock,
});
