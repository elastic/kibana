/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { ILicenseState } from '../lib';
import { verifyAccessAndContext } from './lib';
import { AlertingRequestHandlerContext, INTERNAL_BASE_ALERTING_API_PATH } from '../types';

const bodySchema = schema.object({
  flapping: schema.object({
    enabled: schema.boolean(),
    lookBackWindow: schema.number(),
    statusChangeThreshold: schema.number(),
  }),
});

export const updateRulesConfigurationRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/_rules_configuration`,
      validate: {
        body: bodySchema,
      },
      options: {
        tags: ['access:update-rules-configuration'],
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesConfigurationClient = (
          await context.alerting
        ).getScopedRulesConfigurationClient();
        const updateResults = await rulesConfigurationClient.updateOrCreate(req.body);
        return res.ok({
          body: updateResults.attributes,
        });
      })
    )
  );
};
