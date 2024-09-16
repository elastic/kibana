/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { ILicenseState } from '../../../../lib';
import { verifyAccessAndContext } from '../../../lib';
import { AlertingRequestHandlerContext, INTERNAL_BASE_ALERTING_API_PATH } from '../../../../types';
import { GetScheduleFrequencyResponseV1 } from '../../../schemas/rule/apis/get_schedule_frequency';
import { transformGetScheduleFrequencyResultV1 } from './transforms';

export const getScheduleFrequencyRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rules/_schedule_frequency`,
      validate: {},
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async (context, req, res) => {
        const rulesClient = (await context.alerting).getRulesClient();

        const scheduleFrequencyResult = await rulesClient.getScheduleFrequency();

        const response: GetScheduleFrequencyResponseV1 = {
          body: transformGetScheduleFrequencyResultV1(scheduleFrequencyResult),
        };

        return res.ok(response);
      })
    )
  );
};
