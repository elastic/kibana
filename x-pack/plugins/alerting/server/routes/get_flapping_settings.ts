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
import { API_PRIVILEGES } from '../../common';

export const getFlappingSettingsRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rules/settings/_flapping`,
      validate: false,
      options: {
        tags: [`access:${API_PRIVILEGES.READ_FLAPPING_SETTINGS}`],
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesSettingsClient = (await context.alerting).getRulesSettingsClient();
        const flappingSettings = await rulesSettingsClient.flapping().get();
        return res.ok({ body: flappingSettings });
      })
    )
  );
};
