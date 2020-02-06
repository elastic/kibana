/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isPhase0EntityID, parsePhase0EntityID, Query } from './common';
import { EndpointAppContext } from '../../types';
import { EndpointAppConstants } from '../../../common/types';

export interface PaginationInfo {
  page: number | undefined;
  pageSize: number | undefined;
}

function buildPhase0ChildrenQuery(endpointID: string, uniquePID: string) {
  return {
    bool: {
      filter: {
        bool: {
          should: [
            {
              bool: {
                filter: [
                  {
                    term: { 'endgame.unique_pid': uniquePID },
                  },
                  {
                    term: { 'agent.id': endpointID },
                  },
                ],
              },
            },
            {
              bool: {
                filter: [
                  {
                    term: { 'endgame.unique_ppid': uniquePID },
                  },
                  {
                    term: { 'agent.id': endpointID },
                  },
                ],
              },
            },
          ],
        },
      },
    },
  };
}

function buildPhase1ChildrenQuery(entityID: string) {
  return {
    bool: {
      filter: {
        bool: {
          should: [
            {
              term: { 'endpoint.process.entity_id': entityID },
            },
            {
              term: { 'endpoint.process.parent.entity_id': entityID },
            },
          ],
        },
      },
    },
  };
}

export async function getESChildrenQuery(
  context: EndpointAppContext,
  entityID: string,
  paginationInfo: PaginationInfo
) {
  const { index, query } = getESChildrenCountQuery(entityID);
  return await buildSearchBody(context, query, paginationInfo, index);
}

export function getESChildrenCountQuery(entityID: string): { index: string; query: Query } {
  if (isPhase0EntityID(entityID)) {
    const { endpointID, uniquePID } = parsePhase0EntityID(entityID);
    return {
      index: EndpointAppConstants.ENDGAME_INDEX_NAME,
      query: buildPhase0ChildrenQuery(endpointID, uniquePID),
    };
  }
  return {
    index: EndpointAppConstants.EVENT_INDEX_NAME,
    query: buildPhase1ChildrenQuery(entityID),
  };
}

// this will only get the specific node requested, the UI will need to use the parent_entity_id that we pass back
// otherwise the backend will have to query for the entity ID and then use the endpoint.process.parent.entity_id to
// query again for actual ancestor of the first node
function buildPhase0NodeQuery(endpointID: string, uniquePID: string) {
  return {
    bool: {
      filter: [
        {
          term: { 'endgame.unique_pid': uniquePID },
        },
        {
          term: { 'agent.id': endpointID },
        },
      ],
    },
  };
}

function buildPhase1NodeQuery(entityID: string) {
  return {
    bool: {
      filter: {
        term: { 'endpoint.process.entity_id': entityID },
      },
    },
  };
}

export async function getPagination(
  endpointAppContext: EndpointAppContext,
  paginationInfo: PaginationInfo
) {
  const config = await endpointAppContext.config();
  const page = paginationInfo.page || config.resolverResultListDefaultFirstPageIndex;
  const pageSize = paginationInfo.pageSize || config.resolverResultListDefaultPageSize;
  return {
    page,
    pageSize,
    from: page * pageSize,
  };
}

async function buildSearchBody(
  endpointAppContext: EndpointAppContext,
  queryClause: Query,
  paginationInfo: PaginationInfo,
  index: string
) {
  const { pageSize: size, from } = await getPagination(endpointAppContext, paginationInfo);
  // Need to address https://github.com/elastic/endpoint-app-team/issues/147 here

  return {
    body: {
      query: queryClause,
      sort: [{ '@timestamp': { order: 'asc' } }],
    },
    from,
    size,
    index,
  };
}

export async function getESNodeQuery(
  context: EndpointAppContext,
  entityID: string,
  paginationInfo: PaginationInfo
) {
  const { index, query } = getESNodeCountQuery(entityID);
  return await buildSearchBody(context, query, paginationInfo, index);
}

export function getESNodeCountQuery(entityID: string): { index: string; query: Query } {
  if (isPhase0EntityID(entityID)) {
    const { endpointID, uniquePID } = parsePhase0EntityID(entityID);
    return {
      index: EndpointAppConstants.ENDGAME_INDEX_NAME,
      query: buildPhase0NodeQuery(endpointID, uniquePID),
    };
  }
  return { index: EndpointAppConstants.EVENT_INDEX_NAME, query: buildPhase1NodeQuery(entityID) };
}
