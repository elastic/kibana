/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import {
  scheduleAdHocRuleRunRequestBodySchemaV1,
  ScheduleAdHocRuleRunRequestBodyV1,
} from '../../../../../../common/routes/rule/apis/ad_hoc_rule_runs/schedule';
import { ILicenseState } from '../../../../../lib';
import { verifyAccessAndContext } from '../../../../lib';
import {
  AlertingRequestHandlerContext,
  INTERNAL_BASE_ALERTING_API_PATH,
} from '../../../../../types';
import { transformRequestV1 } from './transforms';

export const scheduleAdHocRuleRun = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rules/ad_hoc_run/_schedule`,
      validate: {
        body: scheduleAdHocRuleRunRequestBodySchemaV1,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesClient = (await context.alerting).getRulesClient();
        const body: ScheduleAdHocRuleRunRequestBodyV1 = req.body;

        /* const result = */ await rulesClient.scheduleAdHocRuleRun(transformRequestV1(body));
        // const response: ScheduleAdHocRuleRunResponseV1 = {
        //   body: transformListTypesResponseV1(result),
        // };
        // return res.ok(response);
        return res.noContent();
      })
    )
  );
};
