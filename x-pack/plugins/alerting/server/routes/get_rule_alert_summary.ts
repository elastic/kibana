/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import camelcaseKeys from 'camelcase-keys';
import snakecaseKeys from 'snakecase-keys';
import { ILicenseState } from '../lib';
import { alertToRule, verifyAccessAndContext } from './lib';
import { AlertingRequestHandlerContext, INTERNAL_BASE_ALERTING_API_PATH } from '../types';

const paramSchema = schema.object({
  id: schema.string(),
});

const querySchema = schema.object({
  date_start: schema.maybe(schema.string()),
  number_of_executions: schema.maybe(schema.number()),
});

export const getRuleAlertSummaryRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rule/{id}/_alert_summary`,
      validate: {
        params: paramSchema,
        query: querySchema,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesClient = (await context.alerting).getRulesClient();
        const { id } = req.params;
        const summary = await rulesClient.getAlertSummary(camelcaseKeys({ id, ...req.query }));
        return res.ok({ body: snakecaseKeys(alertToRule(summary)) });
      })
    )
  );
};
