/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { DocLinksServiceSetup } from '@kbn/core/server';
import type { AlertingRouter } from '../../types';
import { ILicenseState } from '../../lib/license_state';
import { verifyApiAccess } from '../../lib/license_api_access';
import { LEGACY_BASE_ALERT_API_PATH } from '../../../common';
import { trackLegacyRouteUsage } from '../../lib/track_legacy_route_usage';

export const listAlertTypesRoute = (
  router: AlertingRouter,
  licenseState: ILicenseState,
  docLinks: DocLinksServiceSetup,
  usageCounter?: UsageCounter,
  isServerless?: boolean
) => {
  router.get(
    {
      path: `${LEGACY_BASE_ALERT_API_PATH}/list_alert_types`,
      validate: {},
      options: {
        access: isServerless ? 'internal' : 'public',
        summary: 'Get the alert types',
        tags: ['oas-tag:alerting'],
        deprecated: {
          documentationUrl: docLinks.links.alerting.legacyRuleApiDeprecations,
          severity: 'warning',
          reason: {
            type: 'migrate',
            newApiMethod: 'GET',
            newApiPath: '/api/alerting/rule_types',
          },
        },
      },
    },
    router.handleLegacyErrors(async function (context, req, res) {
      verifyApiAccess(licenseState);
      if (!context.alerting) {
        return res.badRequest({ body: 'RouteHandlerContext is not registered for alerting' });
      }
      trackLegacyRouteUsage('listAlertTypes', usageCounter);
      const alertingContext = await context.alerting;
      const rulesClient = await alertingContext.getRulesClient();

      return res.ok({
        body: Array.from(await rulesClient.listRuleTypes()),
      });
    })
  );
};
