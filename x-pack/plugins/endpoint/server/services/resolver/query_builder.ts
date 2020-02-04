/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isPhase0EntityID, parsePhase0EntityID } from './common';
import { EndpointAppContext } from '../../types';

export interface PaginationInfo {
  page: number;
  pageSize: number;
}

function buildPhase0ChildrenQuery(endpointID: string, uniquePID: string) {
  return {
    query: {
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
    },
  };
}

function buildPhase1ChildrenQuery(entityID: string) {
  return {
    query: {
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
    },
  };
}

export async function getESChildrenQuery(
  context: EndpointAppContext,
  entityID: string,
  paginationInfo: PaginationInfo
) {
  if (isPhase0EntityID(entityID)) {
    const [endpointID, uniquePID] = parsePhase0EntityID(entityID);
    return await buildSearchBody(
      context,
      buildPhase0ChildrenQuery(endpointID, uniquePID),
      paginationInfo
    );
  }
  return await buildSearchBody(context, buildPhase1ChildrenQuery(entityID), paginationInfo);
}

export function getESChildrenCountQuery(entityID: string) {
  if (isPhase0EntityID(entityID)) {
    const [endpointID, uniquePID] = parsePhase0EntityID(entityID);
    return buildPhase0ChildrenQuery(endpointID, uniquePID);
  }
  return buildPhase1ChildrenQuery(entityID);
}

// this will only get the specific node requested, the UI will need to use the parent_entity_id that we pass back
// otherwise the backend will have to query for the entity ID and then use the endpoint.process.parent.entity_id to
// query again for actual ancestor of the first node
function buildPhase0NodeQuery(endpointID: string, uniquePID: string) {
  return {
    query: {
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
  };
}

function buildPhase1NodeQuery(entityID: string) {
  return {
    query: {
      bool: {
        filter: {
          term: { 'endpoint.process.entity_id': entityID },
        },
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
  query: any,
  paginationInfo: PaginationInfo
) {
  const { pageSize: size, from } = await getPagination(endpointAppContext, paginationInfo);
  // Need to address https://github.com/elastic/endpoint-app-team/issues/147 here
  // use the default value of 10k here and if it results in a gte perform a count if need be
  const trackTotal = 10000;

  return {
    body: {
      query,
      sort: [{ '@timestamp': { order: 'asc' } }],
    },
    from,
    size,
    // check to see if there is more than the client is requesting so we can indicate they should request the next
    // page
    track_total_hits: trackTotal,
  };
}

export async function getESNodeQuery(
  context: EndpointAppContext,
  entityID: string,
  paginationInfo: PaginationInfo
) {
  if (isPhase0EntityID(entityID)) {
    const [endpointID, uniquePID] = parsePhase0EntityID(entityID);
    return await buildSearchBody(
      context,
      buildPhase0NodeQuery(endpointID, uniquePID),
      paginationInfo
    );
  }
  return await buildSearchBody(context, buildPhase1NodeQuery(entityID), paginationInfo);
}

export function getESNodeCountQuery(entityID: string) {
  if (isPhase0EntityID(entityID)) {
    const [endpointID, uniquePID] = parsePhase0EntityID(entityID);
    return buildPhase0NodeQuery(endpointID, uniquePID);
  }
  return buildPhase1NodeQuery(entityID);
}
