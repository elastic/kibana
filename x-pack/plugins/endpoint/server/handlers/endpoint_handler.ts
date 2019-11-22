/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IClusterClient, KibanaRequest } from 'kibana/server';
import { SearchParams, SearchResponse } from 'elasticsearch';
import { EndpointData } from '../types';

export interface EndpointRequestContext {
  findEndpoint: (
    endpointId: string,
    request: KibanaRequest
  ) => Promise<SearchResponse<EndpointData>>;
  findLatestOfAllEndpoints: (request: KibanaRequest) => Promise<SearchResponse<EndpointData>>;
}

export class EndpointHandler implements EndpointRequestContext {
  private elasticSearchClient: IClusterClient;

  constructor(elasticSearchClient: IClusterClient) {
    this.elasticSearchClient = elasticSearchClient;
  }

  async findEndpoint(
    endpointId: string,
    request: KibanaRequest
  ): Promise<SearchResponse<EndpointData>> {
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
    return await this.search(searchParams, request);
  }

  async findLatestOfAllEndpoints(request: KibanaRequest): Promise<SearchResponse<EndpointData>> {
    const pageSize: number = request.params.pageSize || 10;
    const pageIndex: number = request.params.pageIndex || 0;
    const searchParams: SearchParams = {
      from: pageIndex * pageSize,
      size: pageSize,
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
    return await this.search(searchParams, request);
  }

  private async search(
    clientParams: Record<string, any> = {},
    request: KibanaRequest
  ): Promise<SearchResponse<EndpointData>> {
    const result = this.elasticSearchClient
      .asScoped(request)
      .callAsCurrentUser('search', clientParams);
    return result as Promise<SearchResponse<EndpointData>>;
  }
}
