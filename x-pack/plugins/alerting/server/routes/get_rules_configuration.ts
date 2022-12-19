/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { ILicenseState } from '../lib';
import { AlertingRequestHandlerContext, INTERNAL_BASE_ALERTING_API_PATH } from '../types';
import { verifyAccessAndContext } from './lib';

export const getRulesConfigurationRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/_rules_configuration`,
      validate: false,
      options: {
        tags: ['access:get-rules-configuration'],
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesConfigurationClient = (
          await context.alerting
        ).getScopedRulesConfigurationClient();
        const rulesConfiguration = await rulesConfigurationClient.getOrCreate();
        return res.ok({ body: rulesConfiguration.attributes });
      })
    )
  );
};
