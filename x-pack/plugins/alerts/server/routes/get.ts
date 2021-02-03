/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { ILicenseState } from '../lib/license_state';
import { verifyApiAccess } from '../lib/license_api_access';
import { BASE_ALERT_API_PATH } from '../../common';
import type { AlertingRouter } from '../types';

const paramSchema = schema.object({
  id: schema.string(),
});

export const getAlertRoute = (router: AlertingRouter, licenseState: ILicenseState) => {
  router.get(
    {
      path: `${BASE_ALERT_API_PATH}/alert/{id}`,
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
      const { id } = req.params;
      return res.ok({
        body: await alertsClient.get({ id }),
      });
    })
  );
};
