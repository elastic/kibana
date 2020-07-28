/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { KibanaRequest } from 'kibana/server';
import { esKuery } from '../../../../../../../src/plugins/data/server';
import { EndpointAppContext } from '../../types';

export interface QueryBuilderOptions {
  unenrolledAgentIds?: string[];
}

export async function kibanaRequestToMetadataListESQuery(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  request: KibanaRequest<any, any, any>,
  endpointAppContext: EndpointAppContext,
  index: string,
  queryBuilderOptions?: QueryBuilderOptions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<Record<string, any>> {
  const pagingProperties = await getPagingProperties(request, endpointAppContext);
  return {
    body: {
      query: buildQueryBody(request, queryBuilderOptions?.unenrolledAgentIds!),
      collapse: {
        field: 'host.id',
        inner_hits: {
          name: 'most_recent',
          size: 1,
          sort: [{ 'event.created': 'desc' }],
        },
      },
      aggs: {
        total: {
          cardinality: {
            field: 'host.id',
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
    index,
  };
}

async function getPagingProperties(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  request: KibanaRequest<any, any, any>,
  endpointAppContext: EndpointAppContext
) {
  const config = await endpointAppContext.config();
  const pagingProperties: { page_size?: number; page_index?: number } = {};
  if (request?.body?.paging_properties) {
    for (const property of request.body.paging_properties) {
      Object.assign(
        pagingProperties,
        ...Object.keys(property).map((key) => ({ [key]: property[key] }))
      );
    }
  }
  return {
    pageSize: pagingProperties.page_size || config.endpointResultListDefaultPageSize,
    pageIndex: pagingProperties.page_index || config.endpointResultListDefaultFirstPageIndex,
  };
}

function buildQueryBody(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  request: KibanaRequest<any, any, any>,
  unerolledAgentIds: string[] | undefined
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, any> {
  const filterUnenrolledAgents = unerolledAgentIds && unerolledAgentIds.length > 0;
  if (typeof request?.body?.filter === 'string') {
    const kqlQuery = esKuery.toElasticsearchQuery(esKuery.fromKueryExpression(request.body.filter));
    return {
      bool: {
        must: filterUnenrolledAgents
          ? [
              {
                bool: {
                  must_not: {
                    terms: {
                      'elastic.agent.id': unerolledAgentIds,
                    },
                  },
                },
              },
              {
                ...kqlQuery,
              },
            ]
          : [
              {
                ...kqlQuery,
              },
            ],
      },
    };
  }
  return filterUnenrolledAgents
    ? {
        bool: {
          must_not: {
            terms: {
              'elastic.agent.id': unerolledAgentIds,
            },
          },
        },
      }
    : {
        match_all: {},
      };
}

export function getESQueryHostMetadataByID(hostID: string, index: string) {
  return {
    body: {
      query: {
        match: {
          'host.id': hostID,
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
    index,
  };
}
