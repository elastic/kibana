/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { KibanaRequest } from 'kibana/server';
import { EndpointAppConstants, MetadataIndexGetBodyResult } from '../../../common/types';
import { EndpointAppContext } from '../../types';
import { esKuery } from '../../../../../../src/plugins/data/server';

/**
 * Takes the POST body from the metadata index API.
 * Returns the client params for an Elasticsearch query.
 * Documents used in the 'host' UI
 */
export const kibanaRequestToMetadataListESQuery = async (
  request: KibanaRequest<unknown, unknown, MetadataIndexGetBodyResult>,
  endpointAppContext: EndpointAppContext
): Promise<Record<string, unknown> & { size: number; from: number }> => {
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
  request: KibanaRequest<unknown, unknown, MetadataIndexGetBodyResult>,
  endpointAppContext: EndpointAppContext
) {
  const config = await endpointAppContext.config();
  const pagingProperties: { page_size?: number; page_index?: number } = {};
  if (request.body?.paging_properties) {
    for (const property of request.body.paging_properties) {
      if ('page_size' in property) {
        pagingProperties.page_size = property.page_size;
      } else {
        pagingProperties.page_index = property.page_index;
      }
    }
  }
  // If page_size or page_index are 0 or undefined, use the defaults instead.
  return {
    pageSize: pagingProperties.page_size || config.endpointResultListDefaultPageSize,
    pageIndex: pagingProperties.page_index || config.endpointResultListDefaultFirstPageIndex,
  };
}

function buildQueryBody(
  request: KibanaRequest<unknown, unknown, MetadataIndexGetBodyResult>
): Record<string, unknown> {
  if (typeof request.body?.filter === 'string') {
    return esKuery.toElasticsearchQuery(esKuery.fromKueryExpression(request.body.filter));
  }
  return {
    match_all: {},
  };
}

/**
 * Takes an 'metadata' ID and returns the client params for an Elasticsearch query which returns a metadata document.
 */
export const kibanaRequestToMetadataGetESQuery = (
  request: KibanaRequest<{ id: string }, unknown, unknown>
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
