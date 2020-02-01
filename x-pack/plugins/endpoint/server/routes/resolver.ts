/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';
import { SearchResponse } from 'elasticsearch';
import { schema } from '@kbn/config-schema';
import { EndpointAppContext, EndpointData } from '../types';
import { events } from '../test_data/events';

const phase0EntityPrefix = 'endgame-';

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

function getESChildrenQuery(entityID: string) {
  if (entityID.includes(phase0EntityPrefix)) {
    const fields = entityID.split('-');
    if (fields.length !== 3) {
      throw Error(
        'Invalid entity_id received must be in the format endgame-<endpoint id>-<unique_pid>'
      );
    }

    return buildPhase0ChildrenQuery(fields[1], fields[2]);
  }
  return buildPhase1ChildrenQuery(entityID);
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
        )) as SearchResponse<EndpointMetadata>;

        if (response.hits.hits.length === 0) {
          return res.notFound({ body: 'Endpoint Not Found' });
        }

        return res.ok({ body: response.hits.hits[0]._source });
      } catch (err) {
        return res.internalError({ body: err });
      }

      try {
        return res.ok({
          body: {
            origin,
            children: [...children],
          },
        });
      } catch (err) {
        return res.internalError({ body: err });
      }
    }
  );

  /*router.get(
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
      const entityID = req.query.entityID;
      const origin = events.find(event => event.entityID === entityID);
      const ancestor = events.find(event => event.parentEntityID === entityID);
      try {
        return res.ok({
          body: {
            ancestor,
            origin,
          },
        });
      } catch (err) {
        return res.internalError({ body: err });
      }
    }
  );*/
}
