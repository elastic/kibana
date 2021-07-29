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
          const areApiKeysEnabled = await context.alerting.areApiKeysEnabled();
          const alertingFrameworkHeath = await context.alerting.getFrameworkHealth();

          const frameworkHealth: AlertingFrameworkHealth = {
            isSufficientlySecure: areApiKeysEnabled,
            hasPermanentEncryptionKey: encryptedSavedObjects.canEncrypt,
            alertingFrameworkHeath,
          };

          return res.ok({
            body: rewriteBodyRes(frameworkHealth),
          });
        } catch (error) {
          return res.badRequest({ body: error });
        }
      })
    )
  );
};
