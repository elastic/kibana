/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertingRouter } from '../types';
import { ILicenseState } from '../lib/license_state';
import { verifyApiAccess } from '../lib/license_api_access';
import { AlertingFrameworkHealth } from '../types';
import { EncryptedSavedObjectsPluginSetup } from '../../../encrypted_saved_objects/server';

interface XPackUsageSecurity {
  security?: {
    enabled?: boolean;
    ssl?: {
      http?: {
        enabled?: boolean;
      };
    };
  };
}

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
        const {
          security: {
            enabled: isSecurityEnabled = false,
            ssl: { http: { enabled: isTLSEnabled = false } = {} } = {},
          } = {},
        }: XPackUsageSecurity = await context.core.elasticsearch.legacy.client
          // `transport.request` is potentially unsafe when combined with untrusted user input.
          // Do not augment with such input.
          .callAsInternalUser('transport.request', {
            method: 'GET',
            path: '/_xpack/usage',
          });

        const alertingFrameworkHeath = await context.alerting.getFrameworkHealth();

        const frameworkHealth: AlertingFrameworkHealth = {
          isSufficientlySecure: !isSecurityEnabled || (isSecurityEnabled && isTLSEnabled),
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
