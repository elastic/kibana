/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { IRouter } from '../../../../../src/core/server';
import {
  ALERTS_ROUTE,
  ALERTS_PER_PAGE,
  ENTRY_SESSION_ENTITY_ID_PROPERTY,
  PREVIEW_ALERTS_INDEX,
} from '../../common/constants';
import { expandDottedObject } from '../../common/utils/expand_dotted_object';
import type { AlertsClient, RuleRegistryPluginStartContract } from '../../../rule_registry/server';

export const registerAlertsRoute = (
  router: IRouter,
  ruleRegistry: RuleRegistryPluginStartContract
) => {
  router.get(
    {
      path: ALERTS_ROUTE,
      validate: {
        query: schema.object({
          sessionEntityId: schema.string(),
        }),
      },
    },
    async (_context, request, response) => {
      const client = await ruleRegistry.getRacClientWithRequest(request);
      const { sessionEntityId } = request.query;
      const body = await doSearch(client, sessionEntityId);

      return response.ok({ body });
    }
  );
};

export const doSearch = async (client: AlertsClient, sessionEntityId: string) => {
  const indices = (await client.getAuthorizedAlertsIndices(['siem']))?.filter(
    (index) => index !== PREVIEW_ALERTS_INDEX
  );

  if (!indices) {
    return { events: [] };
  }

  const results = await client.find({
    query: {
      match: {
        [ENTRY_SESSION_ENTITY_ID_PROPERTY]: sessionEntityId,
      },
    },
    track_total_hits: false,
    size: ALERTS_PER_PAGE,
    index: indices.join(','),
  });

  const events = results.hits.hits.map((hit: any) => {
    // the alert indexes flattens many properties. this util unflattens them as session view expects structured json.
    hit._source = expandDottedObject(hit._source);

    return hit;
  });

  return { events };
};
