/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import type { IRouter } from '../../../../../src/core/server/http/router/router';
import { BASE_ALERTING_API_PATH } from '../../common';
import { AlertTypeDisabledError } from '../lib/errors/alert_type_disabled';
import type { ILicenseState } from '../lib/license_state';
import type { MuteOptions } from '../rules_client/rules_client';
import type { AlertingRequestHandlerContext } from '../types';
import type { RewriteRequestCase } from './lib/rewrite_request_case';
import { verifyAccessAndContext } from './lib/verify_access_and_context';

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
          if (e instanceof AlertTypeDisabledError) {
            return e.sendResponse(res);
          }
          throw e;
        }
      })
    )
  );
};
