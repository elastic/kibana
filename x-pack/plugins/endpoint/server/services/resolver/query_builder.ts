/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isLegacyEntityID, parseLegacyEntityID, CountQueryInfo } from './common';
import { EndpointAppContext, JSONish } from '../../types';
import { EndpointAppConstants } from '../../../common/types';

export interface PaginationInfo {
  page: number | undefined;
  pageSize: number | undefined;
}

function buildLegacyChildrenQuery(endpointID: string, uniquePID: string) {
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
                    // had to change these to match queries otherwise I can't get results back, using the kibana
                    // developer mode it works fine AND the api tests when it's also a term...not sure why
                    match: { 'agent.id': endpointID },
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
                    match: { 'agent.id': endpointID },
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
              match: { 'endpoint.process.entity_id': entityID },
            },
            {
              match: { 'endpoint.process.parent.entity_id': entityID },
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

export function getESChildrenCountQuery(entityID: string): CountQueryInfo {
  if (isLegacyEntityID(entityID)) {
    const { endpointID, uniquePID } = parseLegacyEntityID(entityID);
    return {
      index: EndpointAppConstants.LEGACY_EVENT_INDEX_NAME,
      query: buildLegacyChildrenQuery(endpointID, uniquePID),
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
function buildLegacyNodeQuery(endpointID: string, uniquePID: string) {
  return {
    bool: {
      filter: [
        {
          term: { 'endgame.unique_pid': uniquePID },
        },
        {
          match: { 'agent.id': endpointID },
        },
      ],
    },
  };
}

function buildPhase1NodeQuery(entityID: string) {
  return {
    bool: {
      filter: {
        match: { 'endpoint.process.entity_id': entityID },
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
  queryClause: JSONish,
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

export function getESNodeCountQuery(entityID: string): CountQueryInfo {
  if (isLegacyEntityID(entityID)) {
    const { endpointID, uniquePID } = parseLegacyEntityID(entityID);
    return {
      index: EndpointAppConstants.LEGACY_EVENT_INDEX_NAME,
      query: buildLegacyNodeQuery(endpointID, uniquePID),
    };
  }
  return { index: EndpointAppConstants.EVENT_INDEX_NAME, query: buildPhase1NodeQuery(entityID) };
}
