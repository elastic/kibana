/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { WriteResponseBase } from '@elastic/elasticsearch/lib/api/types';
import { clone, merge } from 'lodash';
import type { DeepPartial } from 'utility-types';
import { METADATA_DATASTREAM } from '../../../common/endpoint/constants';
import type { HostMetadata } from '../../../common/endpoint/types';
import { EndpointDocGenerator } from '../../../common/endpoint/generate_data';
import { checkInFleetAgent } from './fleet_services';

const endpointGenerator = new EndpointDocGenerator();

export const sendEndpointMetadataUpdate = async (
  esClient: Client,
  agentId: string,
  overrides: DeepPartial<HostMetadata> = {},
  { checkInAgent = true }: Partial<{ checkInAgent: boolean }> = {}
): Promise<WriteResponseBase> => {
  const lastStreamedDoc = await fetchLastStreamedEndpointUpdate(esClient, agentId);

  if (!lastStreamedDoc) {
    throw new Error(`An endpoint with agent.id of [${agentId}] not found!`);
  }

  if (checkInAgent) {
    // Trigger an agent checkin and just let it run
    checkInFleetAgent(esClient, agentId);
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
