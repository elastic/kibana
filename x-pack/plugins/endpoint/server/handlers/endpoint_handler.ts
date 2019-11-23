/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest } from 'kibana/server';
import { SearchParams, SearchResponse } from 'elasticsearch';
import { EndpointAppContext, EndpointData } from '../types';

export interface EndpointRequestContext {
  findEndpoint: (
    endpointId: string,
    request: KibanaRequest
  ) => Promise<SearchResponse<EndpointData>>;
  findLatestOfAllEndpoints: (request: KibanaRequest) => Promise<SearchResponse<EndpointData>>;
}

export class EndpointHandler implements EndpointRequestContext {
  private readonly endpointAppContext: EndpointAppContext;

  constructor(endpointAppContext: EndpointAppContext) {
    this.endpointAppContext = endpointAppContext;
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
    const config = await this.endpointAppContext.config();
    const pageSize: number = request.params.pageSize || config.pageSize;
    const pageIndex: number = request.params.pageIndex || config.defaultPageIndex;
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
    const result = this.endpointAppContext.clusterClient
      .asScoped(request)
      .callAsCurrentUser('search', clientParams);
    return result as Promise<SearchResponse<EndpointData>>;
  }
}
