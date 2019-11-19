/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandlerContext } from 'kibana/server';
import { SearchParams, SearchResponse } from 'elasticsearch';
import { EndpointData } from '../types';
import { ResponseToEndpointMapper } from './response_to_endpoint_mapper';

export interface EndpointRequestContext {
  findEndpoint: (endpointId: string) => Promise<EndpointData[]>;
  findLatestOfAllEndpoints: () => Promise<EndpointData[]>;
}

export class EndpointHandler implements EndpointRequestContext {
  private context: RequestHandlerContext;
  private responseToEndpointMapper: ResponseToEndpointMapper;

  constructor(context: RequestHandlerContext) {
    this.context = context;
    this.responseToEndpointMapper = new ResponseToEndpointMapper();
  }

  async findEndpoint(endpointId: string): Promise<EndpointData[]> {
    const searchParams: SearchParams = {
      body: {
        query: {
          match: {
            machine_id: endpointId,
          },
        },
        sort: [
          {
            created_at: {
              order: 'desc',
            },
          },
        ],
        size: 1,
      },
      index: 'endpoint*',
    };
    const response = await this.search(searchParams);
    return this.responseToEndpointMapper.mapHits(response);
  }

  async findLatestOfAllEndpoints(): Promise<EndpointData[]> {
    const searchParams: SearchParams = {
      body: {
        query: {
          match_all: {},
        },
        collapse: {
          field: 'machine_id',
          inner_hits: {
            name: 'most_recent',
            size: 1,
            sort: [{ created_at: 'desc' }],
          },
        },
      },
      index: 'endpoint*',
    };
    const response = await this.search(searchParams);
    return this.responseToEndpointMapper.mapInnerHits(response);
  }

  private async search(
    clientParams: Record<string, any> = {}
  ): Promise<SearchResponse<EndpointData>> {
    const result = this.context.core!.elasticsearch.adminClient.callAsInternalUser(
      'search',
      clientParams
    );
    return result as Promise<SearchResponse<EndpointData>>;
  }
}
