/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsAggregate, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { ENDPOINT_HEARTBEAT_INDEX } from '@kbn/security-solution-plugin/common/endpoint/constants';
import type { EndpointHeartbeat } from '@kbn/security-solution-plugin/common/endpoint/types';

const THRESHOLD_MINUTES = 30;

export class EndpointHeartbeatService {
  public async getHeartbeatsSince(
    esClient: ElasticsearchClient,
    since?: Date
  ): Promise<SearchResponse<EndpointHeartbeat, Record<string, AggregationsAggregate>>> {
    const timestamp = new Date().toISOString();
    return {
      hits: {
        hits: [
          {
            _source: {
              '@timestamp': timestamp,
              agent: {
                id: '123',
              },
              event: {
                ingested: timestamp,
              },
            },
          },
        ],
      },
    } as SearchResponse<EndpointHeartbeat, Record<string, AggregationsAggregate>>;

    // TODO
    // const thresholdDate = new Date(Date.now() - THRESHOLD_MINUTES * 60 * 1000);
    // const searchFrom = since && since > thresholdDate ? since : thresholdDate;

    // return esClient.search<EndpointHeartbeat>({
    //   index: ENDPOINT_HEARTBEAT_INDEX,
    //   sort: 'event.ingested',
    //   query: {
    //     range: {
    //       'event.ingested': {
    //         gt: searchFrom.toISOString(),
    //       },
    //     },
    //   },
    // });
  }
}

export const endpointHeartbeatService = new EndpointHeartbeatService();
