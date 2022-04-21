/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { ILicenseState, RuleTypeDisabledError } from '../lib';
import { MuteOptions } from '../rules_client';
import { RewriteRequestCase, verifyAccessAndContext } from './lib';
import { AlertingRequestHandlerContext, BASE_ALERTING_API_PATH } from '../types';

const paramSchema = schema.object({
  rule_id: schema.string(),
  alert_id: schema.string(),
});

const rewriteParamsReq: RewriteRequestCase<MuteOptions> = ({
  rule_id: alertId,
  alert_id: alertInstanceId,
}) => ({
  alertId,
  alertInstanceId,
});

export const muteAlertRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${BASE_ALERTING_API_PATH}/rule/{rule_id}/alert/{alert_id}/_mute`,
      validate: {
        params: paramSchema,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesClient = context.alerting.getRulesClient();
        const params = rewriteParamsReq(req.params);
        try {
          await rulesClient.muteInstance(params);
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
