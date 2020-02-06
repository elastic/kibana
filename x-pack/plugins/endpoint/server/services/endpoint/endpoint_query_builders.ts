/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { KibanaRequest } from 'kibana/server';
import { EndpointAppConstants } from '../../../common/types';
import { EndpointAppContext } from '../../types';
import { esKuery } from '../../../../../../src/plugins/data/server';

export const kibanaRequestToEndpointListQuery = async (
  request: KibanaRequest<any, any, any>,
  endpointAppContext: EndpointAppContext
): Promise<Record<string, any>> => {
  const pagingProperties = await getPagingProperties(request, endpointAppContext);
  return {
    body: {
      query: buildQueryBody(request),
      collapse: {
        field: 'host.id.keyword',
        inner_hits: {
          name: 'most_recent',
          size: 1,
          sort: [{ 'event.created': 'desc' }],
        },
      },
      aggs: {
        total: {
          cardinality: {
            field: 'host.id.keyword',
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
  const pagingProperties: { page_size?: number; page_index?: number } = {};
  if (request?.body?.paging_properties) {
    for (const property of request.body.paging_properties) {
      Object.assign(
        pagingProperties,
        ...Object.keys(property).map(key => ({ [key]: property[key] }))
      );
    }
  }
  return {
    pageSize: pagingProperties.page_size || config.endpointResultListDefaultPageSize,
    pageIndex: pagingProperties.page_index || config.endpointResultListDefaultFirstPageIndex,
  };
}

function buildQueryBody(request: KibanaRequest<any, any, any>): Record<string, any> {
  if (typeof request?.body?.filter === 'string') {
    return esKuery.toElasticsearchQuery(esKuery.fromKueryExpression(request.body.filter));
  }
  return {
    match_all: {},
  };
}

export const kibanaRequestToEndpointFetchQuery = (
  request: KibanaRequest<any, any, any>,
  endpointAppContext: EndpointAppContext
) => {
  return {
    body: {
      query: {
        match: {
          'host.id.keyword': request.params.id,
        },
      },
      sort: [
        {
          'event.created': {
            order: 'desc',
          },
        },
      ],
      size: 1,
    },
    index: EndpointAppConstants.ENDPOINT_INDEX_NAME,
  };
};
