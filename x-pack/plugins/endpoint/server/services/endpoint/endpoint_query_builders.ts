/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { KibanaRequest } from 'kibana/server';
import { EndpointAppConstants, EndpointAppContext } from '../../types';

export const kibanaRequestToEndpointListQuery = async (
  request: KibanaRequest<any, any, any>,
  endpointAppContext: EndpointAppContext
): Promise<Record<string, any>> => {
  const pagingProperties = await getPagingProperties(request, endpointAppContext);
  return {
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
    from: pagingProperties.pageIndex * pagingProperties.pageSize,
    size: pagingProperties.pageSize,
    index: EndpointAppConstants.ENDPOINT_INDEX_NAME,
  };
};

async function getPagingProperties(
  request: KibanaRequest<any, any, any>,
  endpointAppContext: EndpointAppContext
) {
  const config = await endpointAppContext.config();
  const pagingProperties: { pageSize?: number; pageIndex?: number } = {};
  if (request?.body?.pagingProperties) {
    for (const property of request.body.pagingProperties) {
      Object.assign(
        pagingProperties,
        ...Object.keys(property).map(key => ({ [key]: property[key] }))
      );
    }
  }
  return {
    pageSize: pagingProperties.pageSize || config.endpointResultListDefaultPageSize,
    pageIndex: pagingProperties.pageIndex || config.endpointResultListDefaultFirstPageIndex,
  };
}
