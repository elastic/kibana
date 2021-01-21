/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import type { AlertingRouter } from '../types';
import { ILicenseState } from '../lib/license_state';
import { verifyApiAccess } from '../lib/license_api_access';
import { BASE_ALERT_API_PATH } from '../../common';
import { AlertTypeDisabledError } from '../lib/errors/alert_type_disabled';

const paramSchema = schema.object({
  alertId: schema.string(),
  alertInstanceId: schema.string(),
});

export const unmuteAlertInstanceRoute = (router: AlertingRouter, licenseState: ILicenseState) => {
  router.post(
    {
      path: `${BASE_ALERT_API_PATH}/alert/{alertId}/alert_instance/{alertInstanceId}/_unmute`,
      validate: {
        params: paramSchema,
      },
    },
    router.handleLegacyErrors(async function (context, req, res) {
      verifyApiAccess(licenseState);
      if (!context.alerting) {
        return res.badRequest({ body: 'RouteHandlerContext is not registered for alerting' });
      }
      const alertsClient = context.alerting.getAlertsClient();
      const { alertId, alertInstanceId } = req.params;
      try {
        await alertsClient.unmuteInstance({ alertId, alertInstanceId });
        return res.noContent();
      } catch (e) {
        if (e instanceof AlertTypeDisabledError) {
          return e.sendResponse(res);
        }
        throw e;
      }
    })
  );
};
