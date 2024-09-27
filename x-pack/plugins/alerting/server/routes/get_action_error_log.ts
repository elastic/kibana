/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { ILicenseState } from '../lib';
import { GetActionErrorLogByIdParams } from '../rules_client';
import { RewriteRequestCase, verifyAccessAndContext } from './lib';
import { AlertingRequestHandlerContext, INTERNAL_BASE_ALERTING_API_PATH } from '../types';

const paramSchema = schema.object({
  id: schema.string(),
});

const sortOrderSchema = schema.oneOf([schema.literal('asc'), schema.literal('desc')]);

const sortFieldSchema = schema.oneOf([
  schema.object({ '@timestamp': schema.object({ order: sortOrderSchema }) }),
  schema.object({ 'event.duration': schema.object({ order: sortOrderSchema }) }),
]);

const sortFieldsSchema = schema.arrayOf(sortFieldSchema, {
  defaultValue: [{ '@timestamp': { order: 'desc' } }],
});

const querySchema = schema.object({
  date_start: schema.string(),
  date_end: schema.maybe(schema.string()),
  filter: schema.maybe(schema.string()),
  per_page: schema.number({ defaultValue: 10, min: 1 }),
  page: schema.number({ defaultValue: 1, min: 1 }),
  sort: sortFieldsSchema,
  namespace: schema.maybe(schema.string()),
  with_auth: schema.maybe(schema.boolean()),
});

const rewriteReq: RewriteRequestCase<GetActionErrorLogByIdParams> = ({
  date_start: dateStart,
  date_end: dateEnd,
  per_page: perPage,
  namespace,
  ...rest
}) => ({
  ...rest,
  namespace,
  dateStart,
  dateEnd,
  perPage,
});

export const getActionErrorLogRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rule/{id}/_action_error_log`,
      validate: {
        params: paramSchema,
        query: querySchema,
      },
      options: {
        access: 'internal',
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const alertingContext = await context.alerting;
        const rulesClient = await alertingContext.getRulesClient();
        const { id } = req.params;
        const withAuth = req.query.with_auth;
        const rewrittenReq = rewriteReq({ id, ...req.query });
        const getter = (
          withAuth ? rulesClient.getActionErrorLogWithAuth : rulesClient.getActionErrorLog
        ).bind(rulesClient);
        return res.ok({
          body: await getter(rewrittenReq),
        });
      })
    )
  );
};
