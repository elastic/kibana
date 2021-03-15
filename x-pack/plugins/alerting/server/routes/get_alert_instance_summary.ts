/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { AlertingRouter } from '../types';
import { ILicenseState } from '../lib/license_state';
import { verifyApiAccess } from '../lib/license_api_access';
import { BASE_ALERT_API_PATH } from '../../common';

const paramSchema = schema.object({
  id: schema.string(),
});

const querySchema = schema.object({
  dateStart: schema.maybe(schema.string()),
});

export const getAlertInstanceSummaryRoute = (
  router: AlertingRouter,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${BASE_ALERT_API_PATH}/alert/{id}/_instance_summary`,
      validate: {
        params: paramSchema,
        query: querySchema,
      },
    },
    router.handleLegacyErrors(async function (context, req, res) {
      verifyApiAccess(licenseState);
      if (!context.alerting) {
        return res.badRequest({ body: 'RouteHandlerContext is not registered for alerting' });
      }
      const alertsClient = context.alerting.getAlertsClient();
      const { id } = req.params;
      const { dateStart } = req.query;
      const summary = await alertsClient.getAlertInstanceSummary({ id, dateStart });
      return res.ok({ body: summary });
    })
  );
};
