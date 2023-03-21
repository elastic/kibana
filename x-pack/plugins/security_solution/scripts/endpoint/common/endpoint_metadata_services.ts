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
import type { GetMetadataListRequestQuery } from '../../../common/endpoint/schema/metadata';
import { resolvePathVariables } from '../../../public/common/utils/resolve_path_variables';
import {
  HOST_METADATA_GET_ROUTE,
  HOST_METADATA_LIST_ROUTE,
  METADATA_DATASTREAM,
} from '../../../common/endpoint/constants';
import type { HostInfo, HostMetadata, MetadataListResponse } from '../../../common/endpoint/types';
import { EndpointDocGenerator } from '../../../common/endpoint/generate_data';

const endpointGenerator = new EndpointDocGenerator();

export const fetchEndpointMetadata = async (
  kbnClient: KbnClient,
  agentId: string
): Promise<HostInfo> => {
  return (
    await kbnClient.request<HostInfo>({
      method: 'GET',
      path: resolvePathVariables(HOST_METADATA_GET_ROUTE, { id: agentId }),
    })
  ).data;
};

export const fetchEndpointMetadataList = async (
  kbnClient: KbnClient,
  { page = 0, pageSize = 100, ...otherOptions }: Partial<GetMetadataListRequestQuery> = {}
): Promise<MetadataListResponse> => {
  return (
    await kbnClient.request<MetadataListResponse>({
      method: 'GET',
      path: HOST_METADATA_LIST_ROUTE,
      query: {
        page,
        pageSize,
        ...otherOptions,
      },
    })
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
