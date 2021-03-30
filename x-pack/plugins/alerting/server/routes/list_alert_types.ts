/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertingRouter } from '../types';
import { ILicenseState } from '../lib/license_state';
import { verifyApiAccess } from '../lib/license_api_access';
import { BASE_ALERT_API_PATH } from '../../common';

export const listAlertTypesRoute = (router: AlertingRouter, licenseState: ILicenseState) => {
  router.get(
    {
      path: `${BASE_ALERT_API_PATH}/list_alert_types`,
      validate: {},
    },
    router.handleLegacyErrors(async function (context, req, res) {
      verifyApiAccess(licenseState);
      if (!context.alerting) {
        return res.badRequest({ body: 'RouteHandlerContext is not registered for alerting' });
      }
      return res.ok({
        body: Array.from(await context.alerting.getAlertsClient().listAlertTypes()),
      });
    })
  );
};
