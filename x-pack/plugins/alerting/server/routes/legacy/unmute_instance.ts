/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { DocLinksServiceSetup } from '@kbn/core/server';
import type { AlertingRouter } from '../../types';
import { ILicenseState } from '../../lib/license_state';
import { verifyApiAccess } from '../../lib/license_api_access';
import { LEGACY_BASE_ALERT_API_PATH } from '../../../common';
import { RuleTypeDisabledError } from '../../lib/errors/rule_type_disabled';
import { trackLegacyRouteUsage } from '../../lib/track_legacy_route_usage';

const paramSchema = schema.object({
  alertId: schema.string(),
  alertInstanceId: schema.string(),
});

export const unmuteAlertInstanceRoute = (
  router: AlertingRouter,
  licenseState: ILicenseState,
  docLinks: DocLinksServiceSetup,
  usageCounter?: UsageCounter,
  isServerless?: boolean
) => {
  router.post(
    {
      path: `${LEGACY_BASE_ALERT_API_PATH}/alert/{alertId}/alert_instance/{alertInstanceId}/_unmute`,
      validate: {
        params: paramSchema,
      },
      options: {
        access: isServerless ? 'internal' : 'public',
        summary: 'Unmute an alert',
        tags: ['oas-tag:alerting'],
        deprecated: {
          documentationUrl: docLinks.links.alerting.legacyRuleApiDeprecations,
          severity: 'warning',
          reason: {
            type: 'migrate',
            newApiMethod: 'POST',
            newApiPath: '/api/alerting/rule/{rule_id}/alert/{alert_id}/_unmute',
          },
        },
      },
    },
    router.handleLegacyErrors(async function (context, req, res) {
      verifyApiAccess(licenseState);
      if (!context.alerting) {
        return res.badRequest({ body: 'RouteHandlerContext is not registered for alerting' });
      }
      trackLegacyRouteUsage('unmuteInstance', usageCounter);
      const rulesClient = (await context.alerting).getRulesClient();
      const { alertId, alertInstanceId } = req.params;
      try {
        await rulesClient.unmuteInstance({ alertId, alertInstanceId });
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
