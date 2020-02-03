/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';
import { SearchResponse } from 'elasticsearch';
import { schema } from '@kbn/config-schema';
import { ResolverPhase0Data, ResolverPhase1Data } from '../../common/types';
import { EndpointAppContext } from '../types';
import { ResolverNode, phase0EntityPrefix } from '../services/resolver/common';
import { ResolverPhase0Node } from '../services/resolver/phase0_node';
import { ResolverPhase1Node } from '../services/resolver/phase1_node';

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
                      // TODO figure out if the labels.endpoint_id needs to be defined in the mapping otherwise
                      // this has to be match instead of a term
                      match: { 'labels.endpoint_id': endpointID },
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
                      match: { 'labels.endpoint_id': endpointID },
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

function parsePhase0EntityID(entityID: string): [string, string] {
  const fields = entityID.split('-');
  if (fields.length !== 3) {
    throw Error(
      'Invalid entity_id received must be in the format endgame-<endpoint id>-<unique_pid>'
    );
  }
  return [fields[1], fields[2]];
}

function isPhase0EntityID(entityID: string) {
  return entityID.includes(phase0EntityPrefix);
}

function getESChildrenQuery(entityID: string) {
  if (isPhase0EntityID(entityID)) {
    const [endpointID, uniquePID] = parsePhase0EntityID(entityID);
    return buildPhase0ChildrenQuery(endpointID, uniquePID);
  }
  return buildPhase1ChildrenQuery(entityID);
}

function isPhase0Data(data: ResolverPhase0Data | ResolverPhase1Data): data is ResolverPhase0Data {
  return (data as ResolverPhase0Data).endgame?.unique_pid !== undefined;
}

function buildChildrenResponse(
  originEntityID: string,
  esResponse: SearchResponse<ResolverData>
): ResolverChildrenResponse {
  const nodes = new Map<string, ResolverData[]>();
  const originEvents: ResolverData[] = [];
  for (const hit of esResponse.hits.hits) {
    const node = nodeCreator(hit._source);
    const dataArray = nodes.get(node.entityID) || [];
    dataArray.push(node.esData);
    if (node.entityID === originEntityID) {
      originEvents.push(node.esData);
    }
  }
  const children: ResolverResponseNode[] = [];
  for (const [entityID, events] of nodes) {
    children.push({
      entity_id: entityID,
      events,
    });
  }
  return {
    origin: {
      entity_id: originEntityID,
      events: originEvents,
    },
    children,
  };
}

function nodeCreator(data: ResolverData): ResolverNode {
  if (isPhase0Data(data)) {
    return new ResolverPhase0Node(data);
  }
  return new ResolverPhase1Node(data);
}

type ResolverData = ResolverPhase0Data | ResolverPhase1Data;

interface ResolverResponseNode {
  entity_id: string;
  events: ResolverData[];
}

interface ResolverChildrenResponse {
  origin: ResolverResponseNode;
  children: ResolverResponseNode[];
}

export function registerResolverRoutes(router: IRouter, endpointAppContext: EndpointAppContext) {
  router.get(
    {
      path: '/api/endpoint/resolver/children',
      validate: {
        query: schema.object({
          entityID: schema.string(),
        }),
      },
      options: { authRequired: true },
    },
    async (context, req, res) => {
      const entityID = req.query.entityID;
      try {
        const query = getESChildrenQuery(entityID);
        const response = (await context.core.elasticsearch.dataClient.callAsCurrentUser(
          'search',
          query
        )) as SearchResponse<ResolverData>;

        if (response.hits.hits.length === 0) {
          return res.notFound({ body: 'Node not found' });
        }

        return res.ok({
          body: buildChildrenResponse(entityID, response),
        });
      } catch (err) {
        return res.internalError({ body: err });
      }
    }
  );

  router.get(
    {
      path: '/api/endpoint/resolver/ancestor',
      validate: {
        query: schema.object({
          entityID: schema.string(),
        }),
      },
      options: { authRequired: true },
    },
    async (context, req, res) => {
      // TODO
    }
  );
}
