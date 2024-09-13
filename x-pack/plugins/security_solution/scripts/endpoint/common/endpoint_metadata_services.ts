/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { KbnClient } from '@kbn/test';
import type { WriteResponseBase } from '@elastic/elasticsearch/lib/api/types';
import { clone, merge } from 'lodash';
import type { DeepPartial } from 'utility-types';
import {
  RETRYABLE_TRANSIENT_ERRORS,
  retryOnError,
} from '../../../common/endpoint/data_loaders/utils';
import { catchAxiosErrorFormatAndThrow } from '../../../common/endpoint/format_axios_error';
import type { GetMetadataListRequestQuery } from '../../../common/api/endpoint';
import { resolvePathVariables } from '../../../public/common/utils/resolve_path_variables';
import {
  HOST_METADATA_GET_ROUTE,
  HOST_METADATA_LIST_ROUTE,
  METADATA_DATASTREAM,
} from '../../../common/endpoint/constants';
import type { HostInfo, HostMetadata, MetadataListResponse } from '../../../common/endpoint/types';
import { HostStatus } from '../../../common/endpoint/types';
import { EndpointDocGenerator } from '../../../common/endpoint/generate_data';

const endpointGenerator = new EndpointDocGenerator();

export const fetchEndpointMetadata = async (
  kbnClient: KbnClient,
  agentId: string
): Promise<HostInfo> => {
  return (
    await kbnClient
      .request<HostInfo>({
        method: 'GET',
        path: resolvePathVariables(HOST_METADATA_GET_ROUTE, { id: agentId }),
        headers: {
          'Elastic-Api-Version': '2023-10-31',
        },
      })
      .catch(catchAxiosErrorFormatAndThrow)
  ).data;
};

export const fetchEndpointMetadataList = async (
  kbnClient: KbnClient,
  { page = 0, pageSize = 100, ...otherOptions }: Partial<GetMetadataListRequestQuery> = {}
): Promise<MetadataListResponse> => {
  return (
    await kbnClient
      .request<MetadataListResponse>({
        method: 'GET',
        path: HOST_METADATA_LIST_ROUTE,
        headers: {
          'Elastic-Api-Version': '2023-10-31',
        },
        query: {
          page,
          pageSize,
          ...otherOptions,
        },
      })
      .catch(catchAxiosErrorFormatAndThrow)
  ).data;
};

export const sendEndpointMetadataUpdate = async (
  esClient: Client,
  agentId: string,
  overrides: DeepPartial<HostMetadata> = {}
): Promise<WriteResponseBase> => {
  const lastStreamedDoc = await fetchLastStreamedEndpointUpdate(esClient, agentId);

  if (!lastStreamedDoc) {
    throw new Error(
      `An endpoint with agent.id of [${agentId}] not found! [sendEndpointMetadataUpdate()]`
    );
  }

  const generatedHostMetadataDoc = clone(endpointGenerator.generateHostMetadata());
  const newUpdate: HostMetadata = merge(
    lastStreamedDoc,
    {
      event: generatedHostMetadataDoc.event, // Make sure to use a new event object
      '@timestamp': generatedHostMetadataDoc['@timestamp'],
    },
    overrides
  );

  return esClient.index({
    index: METADATA_DATASTREAM,
    body: newUpdate,
    op_type: 'create',
  });
};

const fetchLastStreamedEndpointUpdate = async (
  esClient: Client,
  agentId: string
): Promise<HostMetadata | undefined> => {
  const queryResult = await esClient.search<HostMetadata>(
    {
      index: METADATA_DATASTREAM,
      size: 1,
      body: {
        query: {
          bool: {
            filter: [
              {
                bool: {
                  should: [{ term: { 'elastic.agent.id': agentId } }],
                },
              },
            ],
          },
        },
        // Am I doing this right? I want only the last document for the host.id that was sent
        collapse: {
          field: 'host.id',
          inner_hits: {
            name: 'most_recent',
            size: 1,
            sort: [{ 'event.created': 'desc' }],
          },
        },
        aggs: {
          total: {
            cardinality: {
              field: 'host.id',
            },
          },
        },
        sort: [
          {
            'event.created': {
              order: 'desc',
            },
          },
        ],
      },
    },
    { ignore: [404] }
  );

  return queryResult.hits?.hits[0]?._source;
};

/**
 * Waits for an endpoint to have streamed data to ES and for that data to have made it to the
 * Endpoint Details API (transform destination index)
 * @param kbnClient
 * @param endpointAgentId
 * @param timeoutMs
 */
export const waitForEndpointToStreamData = async (
  kbnClient: KbnClient,
  endpointAgentId: string,
  timeoutMs: number = 60000
): Promise<HostInfo> => {
  const started = new Date();
  const hasTimedOut = (): boolean => {
    const elapsedTime = Date.now() - started.getTime();
    return elapsedTime > timeoutMs;
  };
  let found: HostInfo | undefined;

  while (!found && !hasTimedOut()) {
    found = await retryOnError(
      async () =>
        fetchEndpointMetadataList(kbnClient, {
          kuery: `united.endpoint.agent.id: "${endpointAgentId}"`,
        }).then((response) => {
          return response.data.filter((record) => record.host_status === HostStatus.HEALTHY)[0];
        }),
      RETRYABLE_TRANSIENT_ERRORS
    );

    if (!found) {
      // sleep and check again
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  if (!found) {
    throw new Error(`Timed out waiting for Endpoint id [${endpointAgentId}] to stream data to ES`);
  }

  return found;
};
