/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest } from 'kibana/server';
import { SearchParams, SearchResponse } from 'elasticsearch';
import { EndpointAppContext, EndpointData } from '../types';
import { EndpointQueryBuilder } from '../services/query/endpoint_query_builder';

export interface EndpointRequestContext {
  findEndpoint: (
    endpointId: string,
    request: KibanaRequest<any, any, any>
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
    request: KibanaRequest<any, any, any>
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
      index: 'endpoint-agent*',
    };
    return await this.search(searchParams, request);
  }

  async findLatestOfAllEndpoints(
    request: KibanaRequest<any, any, any>
  ): Promise<SearchResponse<EndpointData>> {
    return await this.search(
      await new EndpointQueryBuilder(request, this.endpointAppContext).toQuery(),
      request
    );
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
