/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import type { AlertingRouter } from '../../types';
import { ILicenseState } from '../../lib/license_state';
import { verifyApiAccess } from '../../lib/license_api_access';
import { AlertingFrameworkHealth } from '../../types';
import { trackLegacyRouteUsage } from '../../lib/track_legacy_route_usage';
import { getSecurityHealth } from '../../lib/get_security_health';

export function healthRoute(
  router: AlertingRouter,
  licenseState: ILicenseState,
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup,
  usageCounter?: UsageCounter
) {
  router.get(
    {
      path: '/api/alerts/_health',
      validate: false,
    },
    router.handleLegacyErrors(async function (context, req, res) {
      verifyApiAccess(licenseState);
      if (!context.alerting) {
        return res.badRequest({ body: 'RouteHandlerContext is not registered for alerting' });
      }
      trackLegacyRouteUsage('health', usageCounter);
      try {
        const alertingContext = await context.alerting;
        // Verify that user has access to at least one rule type
        const ruleTypes = Array.from(await alertingContext.getRulesClient().listAlertTypes());
        if (ruleTypes.length > 0) {
          const alertingFrameworkHealth = await alertingContext.getFrameworkHealth();

          const securityHealth = await getSecurityHealth(
            async () => (licenseState ? licenseState.getIsSecurityEnabled() : null),
            async () => encryptedSavedObjects.canEncrypt,
            alertingContext.areApiKeysEnabled
          );

          const frameworkHealth: AlertingFrameworkHealth = {
            ...securityHealth,
            alertingFrameworkHealth,
          };

          return res.ok({
            body: {
              ...frameworkHealth,
              alertingFrameworkHeath: {
                // Legacy: pre-v8.0 typo
                ...alertingFrameworkHealth,
                _deprecated:
                  'This state property has a typo, use "alertingFrameworkHealth" instead.',
              },
            },
          });
        } else {
          return res.forbidden({
            body: { message: `Unauthorized to access alerting framework health` },
          });
        }
      } catch (error) {
        return res.badRequest({ body: error });
      }
    })
  );
}
