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
import { ResolverNode } from '../services/resolver/common';
import { ResolverPhase0Node } from '../services/resolver/phase0_node';
import { ResolverPhase1Node } from '../services/resolver/phase1_node';
import { getESChildrenQuery, getESNodeQuery } from '../services/resolver/query_builder';

function isPhase0Data(data: ResolverPhase0Data | ResolverPhase1Data): data is ResolverPhase0Data {
  return (data as ResolverPhase0Data).endgame?.unique_pid !== undefined;
}

interface ParentAndResolverData {
  parentEntityID: string;
  events: ResolverData[];
}

type ResolverData = ResolverPhase0Data | ResolverPhase1Data;

interface ResolverResponseNode {
  entity_id: string;
  parent_entity_id: string;
  events: ResolverData[];
}

interface ResolverChildrenResponse {
  origin: ResolverResponseNode;
  children: ResolverResponseNode[];
}

interface ResolverNodeResponse {
  node: ResolverResponseNode;
}

function nodeCreator(data: ResolverData): ResolverNode {
  if (isPhase0Data(data)) {
    return new ResolverPhase0Node(data);
  }
  return new ResolverPhase1Node(data);
}

function buildChildrenResponse(
  originEntityID: string,
  esResponse: SearchResponse<ResolverData>
): ResolverChildrenResponse {
  const nodes = new Map<string, ParentAndResolverData>();
  const originEvents: ResolverData[] = [];
  // handle the case where the origin didn't come back for some reason
  let originParentEntityID: string = '';
  for (const hit of esResponse.hits.hits) {
    const node = nodeCreator(hit._source);
    const parentAndData = nodes.get(node.entityID) || {
      parentEntityID: node.parentEntityID,
      events: [],
    };

    parentAndData.events.push(node.esData);
    if (node.entityID === originEntityID) {
      originEvents.push(node.esData);
      originParentEntityID = node.parentEntityID;
    }
  }
  const children: ResolverResponseNode[] = [];
  for (const [entityID, parentAndData] of nodes) {
    children.push({
      entity_id: entityID,
      parent_entity_id: parentAndData.parentEntityID,
      events: parentAndData.events,
    });
  }
  return {
    origin: {
      parent_entity_id: originParentEntityID,
      entity_id: originEntityID,
      events: originEvents,
    },
    children,
  };
}

function buildNodeResponse(
  entityID: string,
  esResponse: SearchResponse<ResolverData>
): ResolverNodeResponse {
  const events: ResolverData[] = [];
  let parentEntityID = '';
  // there could be multiple events for a single event id because process creation, termination etc will all have the
  // same entity id
  for (const hit of esResponse.hits.hits) {
    const node = nodeCreator(hit._source);
    events.push(node.esData);
    parentEntityID = node.parentEntityID;
  }
  return {
    node: {
      parent_entity_id: parentEntityID,
      entity_id: entityID,
      events,
    },
  };
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
          return res.notFound({ body: 'Nodes not found' });
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
      path: '/api/endpoint/resolver/node',
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
        const query = getESNodeQuery(entityID);
        const response = (await context.core.elasticsearch.dataClient.callAsCurrentUser(
          'search',
          query
        )) as SearchResponse<ResolverData>;
        if (response.hits.hits.length === 0) {
          return res.notFound({ body: 'Node not found' });
        }
        return res.ok({
          body: buildNodeResponse(entityID, response),
        });
      } catch (err) {
        return res.internalError({ body: err });
      }
    }
  );
}
