/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { KibanaRequest } from 'kibana/server';
import { EndpointAppContext } from '../../types';

export class AllEndpointsQueryBuilder {
  private readonly request: KibanaRequest<any, any, any>;
  private readonly endpointAppContext: EndpointAppContext;

  constructor(request: KibanaRequest<any, any, any>, endpointAppContext: EndpointAppContext) {
    this.request = request;
    this.endpointAppContext = endpointAppContext;
  }

  async toQueryParams(): Promise<Record<string, unknown>> {
    const paging = await this.paging();
    return {
      body: {
        query: this.queryBody(),
        collapse: {
          field: 'machine_id',
          inner_hits: {
            name: 'most_recent',
            size: 1,
            sort: [{ created_at: 'desc' }],
          },
        },
        aggs: {
          total: {
            cardinality: {
              field: 'machine_id',
            },
          },
        },
        sort: [
          {
            created_at: {
              order: 'desc',
            },
          },
        ],
      },
      from: paging.pageIndex * paging.pageSize,
      size: paging.pageSize,
      index: 'endpoint-agent*',
    };
  }

  private queryBody(): Record<string, unknown> {
    return {
      match_all: {},
    };
  }

  async paging() {
    const config = await this.endpointAppContext.config();
    return {
      pageSize: this.request.query.pageSize || config.searchResultDefaultPageSize,
      pageIndex: this.request.query.pageIndex || config.searchResultDefaultFirstPageIndex,
    };
  }
}
