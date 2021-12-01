/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from 'kibana/server';
import { ILicenseState } from '../lib';
import { EncryptedSavedObjectsPluginSetup } from '../../../encrypted_saved_objects/server';
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
  alertingFrameworkHeath,
  ...rest
}) => ({
  ...rest,
  is_sufficiently_secure: isSufficientlySecure,
  has_permanent_encryption_key: hasPermanentEncryptionKey,
  alerting_framework_heath: {
    decryption_health: alertingFrameworkHeath.decryptionHealth,
    execution_health: alertingFrameworkHeath.executionHealth,
    read_health: alertingFrameworkHeath.readHealth,
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
          // Verify that user has access to at least one rule type
          const ruleTypes = Array.from(await context.alerting.getRulesClient().listAlertTypes());
          if (ruleTypes.length > 0) {
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
