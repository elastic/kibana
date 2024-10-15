/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { AlertingRequestHandlerContext, INTERNAL_BASE_ALERTING_API_PATH } from '../types';
import { RewriteRequestCase, verifyAccessAndContext } from './lib';
import { GetRuleExecutionKPIParams } from '../rules_client';
import { ILicenseState } from '../lib';

const paramSchema = schema.object({
  id: schema.string(),
});

const querySchema = schema.object({
  date_start: schema.string(),
  date_end: schema.maybe(schema.string()),
  filter: schema.maybe(schema.string()),
});

const rewriteReq: RewriteRequestCase<GetRuleExecutionKPIParams> = ({
  date_start: dateStart,
  date_end: dateEnd,
  ...rest
}) => ({
  ...rest,
  dateStart,
  dateEnd,
});

export const getRuleExecutionKPIRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rule/{id}/_execution_kpi`,
      options: {
        access: 'internal',
      },
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
          body: await rulesClient.getRuleExecutionKPI(rewriteReq({ id, ...req.query })),
        });
      })
    )
  );
};
