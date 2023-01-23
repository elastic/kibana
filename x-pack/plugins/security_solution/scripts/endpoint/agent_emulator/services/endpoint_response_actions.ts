/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/test';
import type { Client } from '@elastic/elasticsearch';
import { AGENT_ACTIONS_RESULTS_INDEX } from '@kbn/fleet-plugin/common';
import * as cborx from 'cbor-x';
import { basename } from 'path';
import { generateFileMetadataDocument } from '../../../../server/endpoint/services/actions/mocks';
import { getFileDownloadId } from '../../../../common/endpoint/service/response_actions/get_file_download_id';
import { checkInFleetAgent } from '../../common/fleet_services';
import { sendEndpointMetadataUpdate } from '../../common/endpoint_metadata_services';
import { FleetActionGenerator } from '../../../../common/endpoint/data_generators/fleet_action_generator';
import {
  ENDPOINT_ACTION_RESPONSES_INDEX,
  ENDPOINTS_ACTION_LIST_ROUTE,
  FILE_STORAGE_DATA_INDEX,
  FILE_STORAGE_METADATA_INDEX,
} from '../../../../common/endpoint/constants';
import type {
  ActionDetails,
  ActionListApiResponse,
  EndpointActionData,
  EndpointActionResponse,
  LogsEndpointActionResponse,
  GetProcessesActionOutputContent,
  ResponseActionGetFileOutputContent,
  ResponseActionGetFileParameters,
  FileUploadMetadata,
} from '../../../../common/endpoint/types';
import type { EndpointActionListRequestQuery } from '../../../../common/endpoint/schema/actions';
import { EndpointActionGenerator } from '../../../../common/endpoint/data_generators/endpoint_action_generator';

const ES_INDEX_OPTIONS = { headers: { 'X-elastic-product-origin': 'fleet' } };

export const fleetActionGenerator = new FleetActionGenerator();

export const endpointActionGenerator = new EndpointActionGenerator();

export const sleep = (ms: number = 1000) => new Promise((r) => setTimeout(r, ms));

export const fetchEndpointActionList = async (
  kbn: KbnClient,
  options: EndpointActionListRequestQuery = {}
): Promise<ActionListApiResponse> => {
  try {
    return (
      await kbn.request<ActionListApiResponse>({
        method: 'GET',
        path: ENDPOINTS_ACTION_LIST_ROUTE,
        query: options,
      })
    ).data;
  } catch (error) {
    // FIXME: remove once the Action List API is fixed (task #5221)
    if (error?.response?.status === 404) {
      return {
        data: [],
        total: 0,
        page: 1,
        pageSize: 10,
        startDate: undefined,
        elasticAgentIds: undefined,
        endDate: undefined,
        userIds: undefined,
        commands: undefined,
        statuses: undefined,
      };
    }

    throw error;
  }
};

export const sendFleetActionResponse = async (
  esClient: Client,
  action: ActionDetails,
  { state }: { state?: 'success' | 'failure' } = {}
): Promise<EndpointActionResponse> => {
  const fleetResponse = fleetActionGenerator.generateResponse({
    action_id: action.id,
    agent_id: action.agents[0],
    action_response: {
      endpoint: {
        ack: true,
      },
    },
  });

  // 20% of the time we generate an error
  if (state === 'failure' || (!state && fleetActionGenerator.randomFloat() < 0.2)) {
    fleetResponse.action_response = {};
    fleetResponse.error = 'Agent failed to deliver message to endpoint due to unknown error';
  } else {
    // show it as success (generator currently always generates a `error`, so delete it)
    delete fleetResponse.error;
  }

  await esClient.index(
    {
      index: AGENT_ACTIONS_RESULTS_INDEX,
      body: fleetResponse,
      refresh: 'wait_for',
    },
    ES_INDEX_OPTIONS
  );

  return fleetResponse;
};

export const sendEndpointActionResponse = async (
  esClient: Client,
  action: ActionDetails,
  { state }: { state?: 'success' | 'failure' } = {}
): Promise<LogsEndpointActionResponse> => {
  const endpointResponse = endpointActionGenerator.generateResponse({
    agent: { id: action.agents[0] },
    EndpointActions: {
      action_id: action.id,
      data: {
        command: action.command as EndpointActionData['command'],
        comment: '',
        ...getOutputDataIfNeeded(action),
      },
      started_at: action.startedAt,
    },
  });

  // 20% of the time we generate an error
  if (state === 'failure' || (state !== 'success' && endpointActionGenerator.randomFloat() < 0.2)) {
    endpointResponse.error = {
      message: 'Endpoint encountered an error and was unable to apply action to host',
    };

    if (endpointResponse.EndpointActions.data.command === 'get-file') {
      (
        endpointResponse.EndpointActions.data.output?.content as ResponseActionGetFileOutputContent
      ).code = endpointActionGenerator.randomGetFileFailureCode();
    }
  }

  await esClient.index({
    index: ENDPOINT_ACTION_RESPONSES_INDEX,
    body: endpointResponse,
    refresh: 'wait_for',
  });

  // ------------------------------------------
  // Post Action Response tasks
  // ------------------------------------------

  // For isolate, If the response is not an error, then also send a metadata update
  if (action.command === 'isolate' && !endpointResponse.error) {
    for (const agentId of action.agents) {
      await Promise.all([
        sendEndpointMetadataUpdate(esClient, agentId, {
          Endpoint: {
            state: {
              isolation: true,
            },
          },
        }),

        checkInFleetAgent(esClient, agentId),
      ]);
    }
  }

  // For UnIsolate, if response is not an Error, then also send metadata update
  if (action.command === 'unisolate' && !endpointResponse.error) {
    for (const agentId of action.agents) {
      await Promise.all([
        sendEndpointMetadataUpdate(esClient, agentId, {
          Endpoint: {
            state: {
              isolation: false,
            },
          },
        }),

        checkInFleetAgent(esClient, agentId),
      ]);
    }
  }

  // For `get-file`, upload a file to ES
  if (action.command === 'get-file' && !endpointResponse.error) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const filePath = (
      action as ActionDetails<ResponseActionGetFileOutputContent, ResponseActionGetFileParameters>
    )?.parameters?.path!;

    const fileName = basename(filePath.replace(/\\/g, '/'));
    const fileMetaDoc: FileUploadMetadata = generateFileMetadataDocument({
      action_id: action.id,
      agent_id: action.agents[0],
      contents: [
        {
          sha256: '8d61673c9d782297b3c774ded4e3d88f31a8869a8f25cf5cdd402ba6822d1d28',
          file_name: fileName ?? 'bad_file.txt',
          path: filePath,
          size: 4,
          type: 'file',
        },
      ],
      file: {
        attributes: ['archive', 'compressed'],
        ChunkSize: 4194304,
        compression: 'deflate',
        hash: {
          sha256: '8d61673c9d782297b3c774ded4e3d88f31a8869a8f25cf5cdd402ba6822d1d28',
        },
        mime_type: 'application/zip',
        name: 'upload.zip',
        extension: 'zip',
        size: 125,
        Status: 'READY',
        type: 'file',
      },
      src: 'endpoint',
    });

    // Index the file's metadata
    const fileMeta = await esClient.index({
      index: FILE_STORAGE_METADATA_INDEX,
      id: getFileDownloadId(action, action.agents[0]),
      body: fileMetaDoc,
      refresh: 'wait_for',
    });

    // Index the file content (just one chunk)
    // call to `.index()` copied from File plugin here:
    // https://github.com/elastic/kibana/blob/main/src/plugins/files/server/blob_storage_service/adapters/es/content_stream/content_stream.ts#L195
    await esClient.index(
      {
        index: FILE_STORAGE_DATA_INDEX,
        id: `${fileMeta._id}.0`,
        document: cborx.encode({
          bid: fileMeta._id,
          last: true,
          data: Buffer.from(
            'UEsDBAoACQAAAFZeRFWpAsDLHwAAABMAAAAMABwAYmFkX2ZpbGUudHh0VVQJAANTVjxjU1Y8Y3V4CwABBPUBAAAEFAAAAMOcoyEq/Q4VyG02U9O0LRbGlwP/y5SOCfRKqLz1rsBQSwcIqQLAyx8AAAATAAAAUEsBAh4DCgAJAAAAVl5EVakCwMsfAAAAEwAAAAwAGAAAAAAAAQAAAKSBAAAAAGJhZF9maWxlLnR4dFVUBQADU1Y8Y3V4CwABBPUBAAAEFAAAAFBLBQYAAAAAAQABAFIAAAB1AAAAAAA=',
            'base64'
          ),
        }),
        refresh: 'wait_for',
      },
      {
        headers: {
          'content-type': 'application/cbor',
          accept: 'application/json',
        },
      }
    );
  }

  return endpointResponse;
};

type ResponseOutput<TOutputContent extends object = object> = Pick<
  LogsEndpointActionResponse<TOutputContent>['EndpointActions']['data'],
  'output'
>;

const getOutputDataIfNeeded = (action: ActionDetails): ResponseOutput => {
  switch (action.command) {
    case 'running-processes':
      return {
        output: {
          type: 'json',
          content: {
            entries: endpointActionGenerator.randomResponseActionProcesses(100),
          },
        },
      } as ResponseOutput<GetProcessesActionOutputContent>;

    case 'get-file':
      return {
        output: {
          type: 'json',
          content: {
            code: 'ra_get-file_success_done',
            zip_size: 123,
            contents: [
              {
                type: 'file',
                path: (
                  action as ActionDetails<
                    ResponseActionGetFileOutputContent,
                    ResponseActionGetFileParameters
                  >
                ).parameters?.path,
                size: 1234,
                file_name: 'bad_file.txt',
                sha256: '9558c5cb39622e9b3653203e772b129d6c634e7dbd7af1b244352fc1d704601f',
              },
            ],
          },
        },
      } as ResponseOutput<ResponseActionGetFileOutputContent>;

    default:
      return { output: undefined };
  }
};
