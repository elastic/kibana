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
  ALERT_ORIGINAL_TIME_PROPERTY,
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
          range: schema.maybe(schema.arrayOf(schema.string())),
        }),
      },
    },
    async (_context, request, response) => {
      const client = await ruleRegistry.getRacClientWithRequest(request);
      const { sessionEntityId, investigatedAlertId, range, cursor } = request.query;
      const body = await searchAlerts(client, sessionEntityId, investigatedAlertId, range, cursor);

      return response.ok({ body });
    }
  );
};

export const searchAlerts = async (
  client: AlertsClient,
  sessionEntityId: string,
  investigatedAlertId?: string,
  range?: string[],
  cursor?: string
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
          // to ensure the investigated alert is always returned (due to maximum loaded alerts per session)
          investigatedAlertId && {
            term: {
              [ALERT_UUID_PROPERTY]: investigatedAlertId,
            },
          },
        ].filter((item) => !!item),
        must: [
          {
            term: {
              [ENTRY_SESSION_ENTITY_ID_PROPERTY]: sessionEntityId,
            },
          },
          range && {
            range: {
              [ALERT_ORIGINAL_TIME_PROPERTY]: {
                gte: range[0],
                lte: range[1],
              },
            },
          },
        ],
      },
    },
    track_total_hits: true,
    size: ALERTS_PER_PAGE,
    index: indices.join(','),
    sort: { [ALERT_ORIGINAL_TIME_PROPERTY]: 'asc' },
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
