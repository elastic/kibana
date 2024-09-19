/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { ILicenseState } from '../../../../lib';
import { AlertingRequestHandlerContext, INTERNAL_BASE_ALERTING_API_PATH } from '../../../../types';
import { verifyAccessAndContext } from '../../../lib';
import { API_PRIVILEGES } from '../../../../../common';
import { transformQueryDelaySettingsToResponseV1 } from '../../transforms';
import { GetQueryDelaySettingsResponseV1 } from '../../../../../common/routes/rules_settings/apis/get';

export const getQueryDelaySettingsRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rules/settings/_query_delay`,
      validate: {},
      options: {
        access: 'internal',
        tags: [`access:${API_PRIVILEGES.READ_QUERY_DELAY_SETTINGS}`],
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesSettingsClient = (await context.alerting).getRulesSettingsClient();
        const queryDelaySettings = await rulesSettingsClient.queryDelay().get();
        const response: GetQueryDelaySettingsResponseV1 =
          transformQueryDelaySettingsToResponseV1(queryDelaySettings);

        return res.ok(response);
      })
    )
  );
};
