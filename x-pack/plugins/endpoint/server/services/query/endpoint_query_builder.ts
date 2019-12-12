/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest } from 'kibana/server';
import { schema } from '@kbn/config-schema';
import { EndpointAppContext } from '../../types';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { RouteSchemas } from '../../../../../../src/core/server/http/router/route';

type filterType = 'term' | 'match';

interface FilterInfo {
  documentValue: string;
  filterType: filterType;
}

export const endpointFilterMapping: Record<string, FilterInfo> = {
  os: { documentValue: 'host.os.full', filterType: 'match' },
  ip: { documentValue: 'host.ip', filterType: 'term' },
  host: { documentValue: 'host.name', filterType: 'match' },
};

export const endpointFilters = schema.oneOf([
  schema.object({ ip: schema.string() }),
  schema.object({ os: schema.string() }),
  schema.object({ host: schema.string() }),
]);
export const endpointRequestSchema: RouteSchemas<any, any, any> = {
  query: schema.object({
    pageSize: schema.number({ defaultValue: 10 }),
    pageIndex: schema.number({ defaultValue: 0 }),
  }),
  body: schema.nullable(
    schema.object({
      filters: schema.arrayOf(endpointFilters),
    })
  ),
};

export class EndpointQueryBuilder {
  private readonly request: KibanaRequest<any, any, any>;
  private readonly endpointAppContext: EndpointAppContext;
  constructor(request: KibanaRequest<any, any, any>, endpointAppContext: EndpointAppContext) {
    this.request = request;
    this.endpointAppContext = endpointAppContext;
  }

  async toQuery(): Promise<Record<string, any>> {
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

  async paging() {
    const config = await this.endpointAppContext.config();
    return {
      pageSize: this.request.query.pageSize || config.searchResultDefaultPageSize,
      pageIndex: this.request.query.pageIndex || config.searchResultDefaultFirstPageIndex,
    };
  }

  private queryBody(): Record<string, any> {
    if (this.request?.body?.filters) {
      const requestFilters = this.request.body.filters;
      const queryFilters: Array<Record<string, any>> = [];

      for (const filter of requestFilters) {
        queryFilters.push(
          ...Object.keys(filter).map(k => ({
            [endpointFilterMapping[k].filterType]: {
              [endpointFilterMapping[k].documentValue]: filter[k],
            },
          }))
        );
      }
      return {
        bool: {
          filter: queryFilters,
        },
      };
    }
    return {
      match_all: {},
    };
  }
}
