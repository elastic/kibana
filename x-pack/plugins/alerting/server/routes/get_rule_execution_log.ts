/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import camelcaseKeys from 'camelcase-keys';
import { ILicenseState } from '../lib';
import { verifyAccessAndContext } from './lib';
import { AlertingRequestHandlerContext, INTERNAL_BASE_ALERTING_API_PATH } from '../types';

const paramSchema = schema.object({
  id: schema.string(),
});

const sortOrderSchema = schema.oneOf([schema.literal('asc'), schema.literal('desc')]);

const sortFieldSchema = schema.oneOf([
  schema.object({ timestamp: schema.object({ order: sortOrderSchema }) }),
  schema.object({ execution_duration: schema.object({ order: sortOrderSchema }) }),
  schema.object({ total_search_duration: schema.object({ order: sortOrderSchema }) }),
  schema.object({ es_search_duration: schema.object({ order: sortOrderSchema }) }),
  schema.object({ schedule_delay: schema.object({ order: sortOrderSchema }) }),
  schema.object({ num_triggered_actions: schema.object({ order: sortOrderSchema }) }),
  schema.object({ num_generated_actions: schema.object({ order: sortOrderSchema }) }),
  schema.object({ num_active_alerts: schema.object({ order: sortOrderSchema }) }),
  schema.object({ num_recovered_alerts: schema.object({ order: sortOrderSchema }) }),
  schema.object({ num_new_alerts: schema.object({ order: sortOrderSchema }) }),
]);

const sortFieldsSchema = schema.arrayOf(sortFieldSchema, {
  defaultValue: [{ timestamp: { order: 'desc' } }],
});

const querySchema = schema.object({
  date_start: schema.string(),
  date_end: schema.maybe(schema.string()),
  filter: schema.maybe(schema.string()),
  per_page: schema.number({ defaultValue: 10, min: 1 }),
  page: schema.number({ defaultValue: 1, min: 1 }),
  sort: sortFieldsSchema,
});

export const getRuleExecutionLogRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rule/{id}/_execution_log`,
      validate: {
        params: paramSchema,
        query: querySchema,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesClient = (await context.alerting).getRulesClient();
        const { id } = req.params;
        return res.ok({
          body: await rulesClient.getExecutionLogForRule(camelcaseKeys({ id, ...req.query })),
        });
      })
    )
  );
};
