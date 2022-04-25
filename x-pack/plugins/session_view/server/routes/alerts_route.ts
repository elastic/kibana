/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { IRouter } from '@kbn/core/server';
import type {
  AlertsClient,
  RuleRegistryPluginStartContract,
} from '@kbn/rule-registry-plugin/server';
import {
  ALERTS_ROUTE,
  ALERTS_PER_PAGE,
  ENTRY_SESSION_ENTITY_ID_PROPERTY,
  ALERT_UUID_PROPERTY,
  PREVIEW_ALERTS_INDEX,
} from '../../common/constants';
import { expandDottedObject } from '../../common/utils/expand_dotted_object';

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
          investigatedAlertId: schema.maybe(schema.string()),
          cursor: schema.maybe(schema.string()),
          forward: schema.maybe(schema.boolean()),
        }),
      },
    },
    async (_context, request, response) => {
      const client = await ruleRegistry.getRacClientWithRequest(request);
      const { sessionEntityId, investigatedAlertId, cursor, forward } = request.query;
      const body = await doSearch(client, sessionEntityId, investigatedAlertId, cursor, forward);

      return response.ok({ body });
    }
  );
};

export const doSearch = async (
  client: AlertsClient,
  sessionEntityId: string,
  investigatedAlertId?: string,
  cursor?: string,
  forward?: boolean
) => {
  const indices = (await client.getAuthorizedAlertsIndices(['siem']))?.filter(
    (index) => index !== PREVIEW_ALERTS_INDEX
  );

  if (!indices) {
    return { events: [] };
  }

  const results = await client.find({
    query: {
      bool: {
        // OR condition
        should: [
          {
            term: {
              [ENTRY_SESSION_ENTITY_ID_PROPERTY]: sessionEntityId,
            },
          },
          // to ensure the investigated alert is always returned (due to maximum loaded alerts per session)
          investigatedAlertId && {
            term: {
              [ALERT_UUID_PROPERTY]: investigatedAlertId,
            },
          },
        ].filter((item) => !!item),
      },
    },
    track_total_hits: true,
    size: ALERTS_PER_PAGE,
    index: indices.join(','),
    sort: [{ 'kibana.alert.original_time': forward ? 'asc' : 'desc' }],
    lastSortIds: cursor ? [cursor] : undefined,
  });

  const events = results.hits.hits.map((hit: any) => {
    // the alert indexes flattens many properties. this util unflattens them as session view expects structured json.
    hit._source = expandDottedObject(hit._source);

    return hit;
  });

  const total =
    typeof results.hits.total === 'number' ? results.hits.total : results.hits.total?.value;

  return { total, events };
};
