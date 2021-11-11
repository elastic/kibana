/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UsageCounter } from 'src/plugins/usage_collection/server';
import type { AlertingRouter } from '../../types';
import { ILicenseState } from '../../lib/license_state';
import { verifyApiAccess } from '../../lib/license_api_access';
import { AlertingFrameworkHealth } from '../../types';
import { EncryptedSavedObjectsPluginSetup } from '../../../../encrypted_saved_objects/server';
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
        const alertingFrameworkHeath = await context.alerting.getFrameworkHealth();

        const securityHealth = await getSecurityHealth(
          async () => (licenseState ? licenseState.getIsSecurityEnabled() : null),
          async () => encryptedSavedObjects.canEncrypt,
          context.alerting.areApiKeysEnabled
        );

        const frameworkHealth: AlertingFrameworkHealth = {
          ...securityHealth,
          alertingFrameworkHeath,
        };

        return res.ok({
          body: frameworkHealth,
        });
      } catch (error) {
        return res.badRequest({ body: error });
      }
    })
  );
}
