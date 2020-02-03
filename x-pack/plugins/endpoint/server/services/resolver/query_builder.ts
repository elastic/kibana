/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isPhase0EntityID, parsePhase0EntityID } from './common';

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

export function getESChildrenQuery(entityID: string) {
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
            // TODO figure out if the labels.endpoint_id needs to be defined in the mapping otherwise
            // this has to be match instead of a term
            match: { 'agent.id': endpointID },
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

export function getESNodeQuery(entityID: string) {
  if (isPhase0EntityID(entityID)) {
    const [endpointID, uniquePID] = parsePhase0EntityID(entityID);
    return buildPhase0NodeQuery(endpointID, uniquePID);
  }
  return buildPhase1NodeQuery(entityID);
}
