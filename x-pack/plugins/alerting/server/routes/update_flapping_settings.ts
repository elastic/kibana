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
import { API_PRIVILEGES } from '../../common';

const bodySchema = schema.object({
  enabled: schema.boolean(),
  lookBackWindow: schema.number(),
  statusChangeThreshold: schema.number(),
});

export const updateFlappingSettingsRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rules/settings/_flapping`,
      validate: {
        body: bodySchema,
      },
      options: {
        tags: [`access:${API_PRIVILEGES.WRITE_FLAPPING_SETTINGS}`],
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesSettingsClient = (await context.alerting).getRulesSettingsClient();

        const updatedFlappingSettings = await rulesSettingsClient.flapping().update(req.body);

        return res.ok({
          body: updatedFlappingSettings,
        });
      })
    )
  );
};
