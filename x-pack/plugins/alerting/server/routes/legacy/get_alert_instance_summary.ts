/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { UsageCounter } from '@kbn/usage-collection-plugin/server';
import type { AlertingRouter } from '../../types';
import { ILicenseState } from '../../lib/license_state';
import { verifyApiAccess } from '../../lib/license_api_access';
import { AlertSummary, LEGACY_BASE_ALERT_API_PATH } from '../../../common';
import { trackLegacyRouteUsage } from '../../lib/track_legacy_route_usage';

const paramSchema = schema.object({
  id: schema.string(),
});

const querySchema = schema.object({
  dateStart: schema.maybe(schema.string()),
});

const rewriteBodyRes = ({ ruleTypeId, alerts, ...rest }: AlertSummary) => ({
  ...rest,
  alertTypeId: ruleTypeId,
  instances: alerts,
});

export const getAlertInstanceSummaryRoute = (
  router: AlertingRouter,
  licenseState: ILicenseState,
  usageCounter?: UsageCounter
) => {
  router.get(
    {
      path: `${LEGACY_BASE_ALERT_API_PATH}/alert/{id}/_instance_summary`,
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
      trackLegacyRouteUsage('instanceSummary', usageCounter);
      const rulesClient = context.alerting.getRulesClient();
      const { id } = req.params;
      const { dateStart } = req.query;
      const summary = await rulesClient.getAlertSummary({ id, dateStart });

      return res.ok({ body: rewriteBodyRes(summary) });
    })
  );
};
