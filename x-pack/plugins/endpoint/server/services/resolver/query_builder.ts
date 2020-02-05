/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isPhase0EntityID, parsePhase0EntityID, Query } from './common';
import { EndpointAppContext } from '../../types';

export interface PaginationInfo {
  page: number | undefined;
  pageSize: number | undefined;
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
  return await buildSearchBody(context, getESChildrenCountQuery(entityID), paginationInfo);
}

export function getESChildrenCountQuery(entityID: string) {
  if (isPhase0EntityID(entityID)) {
    const { endpointID, uniquePID } = parsePhase0EntityID(entityID);
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
  query: Query,
  paginationInfo: PaginationInfo
) {
  const { pageSize: size, from } = await getPagination(endpointAppContext, paginationInfo);
  // Need to address https://github.com/elastic/endpoint-app-team/issues/147 here

  return {
    body: {
      query,
      sort: [{ '@timestamp': { order: 'asc' } }],
    },
    from,
    size,
  };
}

export async function getESNodeQuery(
  context: EndpointAppContext,
  entityID: string,
  paginationInfo: PaginationInfo
) {
  return await buildSearchBody(context, getESNodeCountQuery(entityID), paginationInfo);
}

export function getESNodeCountQuery(entityID: string) {
  if (isPhase0EntityID(entityID)) {
    const { endpointID, uniquePID } = parsePhase0EntityID(entityID);
    return buildPhase0NodeQuery(endpointID, uniquePID);
  }
  return buildPhase1NodeQuery(entityID);
}
