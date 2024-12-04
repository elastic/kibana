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
import { trackLegacyRouteUsage } from '../../lib/track_legacy_route_usage';

const paramSchema = schema.object({
  id: schema.string(),
});

export const deleteAlertRoute = (
  router: AlertingRouter,
  licenseState: ILicenseState,
  docLinks: DocLinksServiceSetup,
  usageCounter?: UsageCounter,
  isServerless?: boolean
) => {
  router.delete(
    {
      path: `${LEGACY_BASE_ALERT_API_PATH}/alert/{id}`,
      validate: {
        params: paramSchema,
      },
      options: {
        access: isServerless ? 'internal' : 'public',
        summary: 'Delete an alert',
        tags: ['oas-tag:alerting'],
        deprecated: {
          documentationUrl: docLinks.links.alerting.legacyRuleApiDeprecations,
          severity: 'warning',
          reason: {
            type: 'migrate',
            newApiMethod: 'DELETE',
            newApiPath: '/api/alerting/rule/{id}',
          },
        },
      },
    },
    router.handleLegacyErrors(async function (context, req, res) {
      verifyApiAccess(licenseState);
      if (!context.alerting) {
        return res.badRequest({ body: 'RouteHandlerContext is not registered for alerting' });
      }
      trackLegacyRouteUsage('delete', usageCounter);
      const alertingContext = await context.alerting;
      const rulesClient = await alertingContext.getRulesClient();
      const { id } = req.params;
      await rulesClient.delete({ id });
      return res.noContent();
    })
  );
};
