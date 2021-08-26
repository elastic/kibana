/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertingRouter } from '../../types';
import { ILicenseState } from '../../lib/license_state';
import { verifyApiAccess } from '../../lib/license_api_access';
import { AlertingFrameworkHealth } from '../../types';
import { EncryptedSavedObjectsPluginSetup } from '../../../../encrypted_saved_objects/server';

export function healthRoute(
  router: AlertingRouter,
  licenseState: ILicenseState,
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup
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
      try {
        const isEsSecurityEnabled: boolean | null = licenseState.getIsSecurityEnabled();
        const alertingFrameworkHeath = await context.alerting.getFrameworkHealth();
        const areApiKeysEnabled = await context.alerting.areApiKeysEnabled();

        let isSufficientlySecure;
        if (isEsSecurityEnabled === null) {
          isSufficientlySecure = false;
        } else {
          // if isEsSecurityEnabled = true, then areApiKeysEnabled must be true to enable alerting
          // if isEsSecurityEnabled = false, then it does not matter what areApiKeysEnabled is
          isSufficientlySecure = !isEsSecurityEnabled || (isEsSecurityEnabled && areApiKeysEnabled);
        }

        const frameworkHealth: AlertingFrameworkHealth = {
          isSufficientlySecure,
          hasPermanentEncryptionKey: encryptedSavedObjects.canEncrypt,
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
