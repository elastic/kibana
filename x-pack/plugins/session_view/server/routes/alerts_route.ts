/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import type { ElasticsearchClient } from 'kibana/server';
import { IRouter } from '../../../../../src/core/server';
import {
  ALERTS_ROUTE,
  ALERTS_PER_PAGE,
  ALERTS_INDEX,
  ENTRY_SESSION_ENTITY_ID_PROPERTY,
} from '../../common/constants';
import { expandDottedObject } from '../../common/utils/expand_dotted_object';

export const registerAlertsRoute = (router: IRouter) => {
  router.get(
    {
      path: ALERTS_ROUTE,
      validate: {
        query: schema.object({
          sessionEntityId: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const client = context.core.elasticsearch.client.asCurrentUser;
      const { sessionEntityId } = request.query;
      const body = await doSearch(client, sessionEntityId);

      return response.ok({ body });
    }
  );
};

export const doSearch = async (client: ElasticsearchClient, sessionEntityId: string) => {
  const search = await client.search({
    index: [ALERTS_INDEX],
    ignore_unavailable: true, // on a new installation the .siem-signals-default index might not be created yet.
    body: {
      query: {
        match: {
          [ENTRY_SESSION_ENTITY_ID_PROPERTY]: sessionEntityId,
        },
      },
      // This runtime_mappings is a temporary fix, so we are able to Query these ECS fields while they are not available
      // TODO: Remove the runtime_mappings once process.entry_leader.entity_id is implemented to ECS
      runtime_mappings: {
        [ENTRY_SESSION_ENTITY_ID_PROPERTY]: {
          type: 'keyword',
        },
      },
      size: ALERTS_PER_PAGE,
      sort: [{ '@timestamp': 'asc' }],
    },
  });

  const events = search.hits.hits.map((hit: any) => {
    // TODO: re-eval if this is needed after updated ECS mappings are applied.
    // the .siem-signals-default index flattens many properties. this util unflattens them.
    hit._source = expandDottedObject(hit._source);

    return hit;
  });

  return { events };
};
