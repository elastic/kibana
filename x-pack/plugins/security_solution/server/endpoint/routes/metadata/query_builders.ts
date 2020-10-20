/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { KibanaRequest } from 'kibana/server';
import { esKuery } from '../../../../../../../src/plugins/data/server';
import { EndpointAppContext, MetadataQueryStrategy } from '../../types';

export interface QueryBuilderOptions {
  unenrolledAgentIds?: string[];
  statusAgentIDs?: string[];
}

export async function kibanaRequestToMetadataListESQuery(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  request: KibanaRequest<any, any, any>,
  endpointAppContext: EndpointAppContext,
  metadataQueryStrategy: MetadataQueryStrategy,
  queryBuilderOptions?: QueryBuilderOptions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<Record<string, any>> {
  const pagingProperties = await getPagingProperties(request, endpointAppContext);

  return {
    body: {
      query: buildQueryBody(
        request,
        metadataQueryStrategy,
        queryBuilderOptions?.unenrolledAgentIds!,
        queryBuilderOptions?.statusAgentIDs!
      ),
      ...metadataQueryStrategy.extraBodyProperties,
      sort: metadataQueryStrategy.sortProperty,
    },
    from: pagingProperties.pageIndex * pagingProperties.pageSize,
    size: pagingProperties.pageSize,
    index: metadataQueryStrategy.index,
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
  metadataQueryStrategy: MetadataQueryStrategy,
  unerolledAgentIds: string[] | undefined,
  statusAgentIDs: string[] | undefined
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, any> {
  const filterUnenrolledAgents =
    unerolledAgentIds && unerolledAgentIds.length > 0
      ? {
          must_not: {
            terms: {
              [metadataQueryStrategy.elasticAgentIdProperty]: unerolledAgentIds,
            },
          },
        }
      : null;
  const filterStatusAgents = statusAgentIDs
    ? {
        must: {
          terms: {
            [metadataQueryStrategy.elasticAgentIdProperty]: statusAgentIDs,
          },
        },
      }
    : null;

  const idFilter = {
    bool: {
      ...filterUnenrolledAgents,
      ...filterStatusAgents,
    },
  };

  if (request?.body?.filters?.kql) {
    const kqlQuery = esKuery.toElasticsearchQuery(
      esKuery.fromKueryExpression(request.body.filters.kql)
    );
    const q = [];
    if (filterUnenrolledAgents || filterStatusAgents) {
      q.push(idFilter);
    }
    q.push({ ...kqlQuery });
    return {
      bool: { must: q },
    };
  }
  return filterUnenrolledAgents || filterStatusAgents
    ? idFilter
    : {
        match_all: {},
      };
}

export function getESQueryHostMetadataByID(
  agentID: string,
  metadataQueryStrategy: MetadataQueryStrategy
) {
  return {
    body: {
      query: {
        match: {
          [metadataQueryStrategy.hostIdProperty]: agentID,
        },
      },
      sort: metadataQueryStrategy.sortProperty,
      size: 1,
    },
    index: metadataQueryStrategy.index,
  };
}
