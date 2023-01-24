/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import { ILicenseState } from '../lib';
import { RewriteResponseCase, verifyAccessAndContext } from './lib';
import {
  AlertingRequestHandlerContext,
  BASE_ALERTING_API_PATH,
  AlertingFrameworkHealth,
} from '../types';
import { getSecurityHealth } from '../lib/get_security_health';

const rewriteBodyRes: RewriteResponseCase<AlertingFrameworkHealth> = ({
  isSufficientlySecure,
  hasPermanentEncryptionKey,
  alertingFrameworkHealth,
  ...rest
}) => ({
  ...rest,
  is_sufficiently_secure: isSufficientlySecure,
  has_permanent_encryption_key: hasPermanentEncryptionKey,
  alerting_framework_health: {
    decryption_health: alertingFrameworkHealth.decryptionHealth,
    execution_health: alertingFrameworkHealth.executionHealth,
    read_health: alertingFrameworkHealth.readHealth,
  },
  alerting_framework_heath: {
    // Legacy: pre-v8.0 typo
    _deprecated: 'This state property has a typo, use "alerting_framework_health" instead.',
    decryption_health: alertingFrameworkHealth.decryptionHealth,
    execution_health: alertingFrameworkHealth.executionHealth,
    read_health: alertingFrameworkHealth.readHealth,
  },
});

export const healthRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState,
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup
) => {
  router.get(
    {
      path: `${BASE_ALERTING_API_PATH}/_health`,
      validate: false,
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
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
              body: rewriteBodyRes(frameworkHealth),
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
    )
  );
};
