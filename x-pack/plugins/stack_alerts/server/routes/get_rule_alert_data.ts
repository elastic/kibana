/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { StackAlertsRuleRegistry, StackAlertsPluginRouter } from '../types';

const paramSchema = schema.object({
  id: schema.string(),
});

const querySchema = schema.object({
  date_start: schema.maybe(schema.string()),
  date_end: schema.maybe(schema.string()),
});

// const rangeQuery = (start: number, end: number, field = '@timestamp'): QueryContainer[] {
//   return [
//     {
//       range: {
//         [field]: {
//           gte: start,
//           lte: end,
//           format: 'epoch_millis',
//         },
//       },
//     },
//   ];
// }

export const getRuleAlertDataRoute = (
  router: StackAlertsPluginRouter,
  ruleRegistry: StackAlertsRuleRegistry
) => {
  router.get(
    {
      path: `/internal/stack_alerts/rule/{id}/_alert_data`,
      validate: {
        params: paramSchema,
        query: querySchema,
      },
    },
    router.handleLegacyErrors(async function (context, req, res) {
      const { id } = req.params;
      const alertingRuleRegistryClient = await ruleRegistry.createScopedRuleRegistryClient({
        alertsClient: context.alerting.getAlertsClient(),
        context,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let events: any[] = [];
      if (alertingRuleRegistryClient) {
        const data = await alertingRuleRegistryClient.search({
          body: {
            query: {
              bool: {
                filter: [
                  /* ...rangeQuery(start, end),*/ { term: { 'event.kind': 'alert' } },
                  { term: { 'rule.uuid': id } },
                ],
              },
            },
            size: 100,
            fields: ['*'],
            collapse: {
              field: 'kibana.rac.alert.uuid',
            },
            sort: {
              '@timestamp': 'desc',
            },
          },
        });
        events = data.events;
      }

      return res.ok({ body: events });
    })
  );
};
