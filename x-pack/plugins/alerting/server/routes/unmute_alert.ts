/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import camelcaseKeys from 'camelcase-keys';
import { ruleToAlertParams } from './lib/rule_alert_rename';
import { ILicenseState, RuleTypeDisabledError } from '../lib';
import { verifyAccessAndContext } from './lib';
import { AlertingRequestHandlerContext, BASE_ALERTING_API_PATH } from '../types';

const paramSchema = schema.object({
  rule_id: schema.string(),
  alert_id: schema.string(),
});

export const unmuteAlertRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${BASE_ALERTING_API_PATH}/rule/{rule_id}/alert/{alert_id}/_unmute`,
      validate: {
        params: paramSchema,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesClient = (await context.alerting).getRulesClient();
        const params = camelcaseKeys(ruleToAlertParams(req.params));
        try {
          await rulesClient.unmuteInstance(params);
          return res.noContent();
        } catch (e) {
          if (e instanceof RuleTypeDisabledError) {
            return e.sendResponse(res);
          }
          throw e;
        }
      })
    )
  );
};
