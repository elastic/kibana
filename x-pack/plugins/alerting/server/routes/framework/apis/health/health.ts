/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import { healthFrameworkResponseSchemaV1 } from '../../../../../common/routes/framework/apis/health';
import { ILicenseState } from '../../../../lib';
import { verifyAccessAndContext } from '../../../lib';
import {
  AlertingRequestHandlerContext,
  BASE_ALERTING_API_PATH,
  AlertingFrameworkHealth,
} from '../../../../types';
import { getSecurityHealth } from '../../../../lib/get_security_health';
import { transformHealthBodyResponse } from './transforms/transform_health_response/v1';

export const healthRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState,
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup
) => {
  router.get(
    {
      path: `${BASE_ALERTING_API_PATH}/_health`,
      options: {
        access: 'public',
        summary: `Get the alerting framework health`,
        tags: ['oas-tag:alerting'],
      },
      validate: {
        request: {},
        response: {
          200: {
            body: () => healthFrameworkResponseSchemaV1,
            description: 'Indicates a successful call.',
          },
          401: {
            description: 'Authorization information is missing or invalid.',
          },
        },
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        try {
          const alertingContext = await context.alerting;
          const rulesClient = await alertingContext.getRulesClient();
          // Verify that user has access to at least one rule type
          const ruleTypes = Array.from(await rulesClient.listRuleTypes());
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
              body: transformHealthBodyResponse(frameworkHealth),
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
