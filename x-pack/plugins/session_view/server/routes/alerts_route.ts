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
          sessionStartTime: schema.string(),
          investigatedAlertId: schema.maybe(schema.string()),
          cursor: schema.maybe(schema.string()),
        }),
      },
    },
    async (_context, request, response) => {
      const client = await ruleRegistry.getRacClientWithRequest(request);
      const { sessionEntityId, sessionStartTime, investigatedAlertId, cursor } = request.query;

      try {
        const body = await searchAlerts(
          client,
          sessionEntityId,
          ALERTS_PER_PAGE,
          investigatedAlertId,
          [sessionStartTime],
          cursor
        );

        return response.ok({ body });
      } catch (err) {
        return response.badRequest(err.message);
      }
    }
  );
};

export const searchAlerts = async (
  client: AlertsClient,
  sessionEntityId: string,
  size: number,
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

  try {
    const results = await client.find({
      query: {
        bool: {
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
          ].filter((item) => !!item),
        },
      },
      track_total_hits: true,
      size,
      index: indices.join(','),
      sort: [{ '@timestamp': 'asc' }],
      search_after: cursor ? [cursor] : undefined,
    });

    // if an alert is being investigated, fetch it on it's own, as it's not guaranteed to come back in the above request.
    // we only need to do this for the first page of alerts.
    if (!cursor && investigatedAlertId) {
      const investigatedAlertSearch = await client.find({
        query: {
          match: {
            [ALERT_UUID_PROPERTY]: investigatedAlertId,
          },
        },
        size: 1,
        index: indices.join(','),
      });

      if (investigatedAlertSearch.hits.hits.length > 0) {
        results.hits.hits.unshift(investigatedAlertSearch.hits.hits[0]);
      }
    }

    const events = results.hits.hits.map((hit: any) => {
      // the alert indexes flattens many properties. this util unflattens them as session view expects structured json.
      hit._source = expandDottedObject(hit._source);

      return hit;
    });

    const total =
      typeof results.hits.total === 'number' ? results.hits.total : results.hits.total?.value;

    return { total, events };
  } catch (err) {
    // unauthorized
    if (err.output.statusCode === 404) {
      return { total: 0, events: [] };
    }

    throw err;
  }
};
