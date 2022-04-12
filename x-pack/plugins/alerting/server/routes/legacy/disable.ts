/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { UsageCounter } from 'src/plugins/usage_collection/server';
import type { AlertingRouter } from '../../types';
import { ILicenseState } from '../../lib/license_state';
import { verifyApiAccess } from '../../lib/license_api_access';
import { LEGACY_BASE_ALERT_API_PATH } from '../../../common';
import { RuleTypeDisabledError } from '../../lib/errors/rule_type_disabled';
import { trackLegacyRouteUsage } from '../../lib/track_legacy_route_usage';

const paramSchema = schema.object({
  id: schema.string(),
});

export const disableAlertRoute = (
  router: AlertingRouter,
  licenseState: ILicenseState,
  usageCounter?: UsageCounter
) => {
  router.post(
    {
      path: `${LEGACY_BASE_ALERT_API_PATH}/alert/{id}/_disable`,
      validate: {
        params: paramSchema,
      },
    },
    router.handleLegacyErrors(async function (context, req, res) {
      verifyApiAccess(licenseState);
      if (!context.alerting) {
        return res.badRequest({ body: 'RouteHandlerContext is not registered for alerting' });
      }
      trackLegacyRouteUsage('disable', usageCounter);
      const rulesClient = (await context.alerting).getRulesClient();
      const { id } = req.params;
      try {
        await rulesClient.disable({ id });
        return res.noContent();
      } catch (e) {
        if (e instanceof RuleTypeDisabledError) {
          return e.sendResponse(res);
        }
        throw e;
      }
    })
  );
};
