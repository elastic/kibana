/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import { IRouter } from '@kbn/core/server';
import {
  snoozeBodySchema,
  snoozeParamsSchema,
} from '../../../../../common/routes/rule/apis/snooze';
import { ILicenseState, RuleMutedError } from '../../../../lib';
import { verifyAccessAndContext } from '../../../lib';
import { AlertingRequestHandlerContext, INTERNAL_ALERTING_SNOOZE_RULE } from '../../../../types';
import { transformSnoozeBodyV1 } from './transforms';

export type SnoozeRuleRequestParamsV1 = TypeOf<typeof snoozeParamsSchema>;

export const snoozeRuleRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: INTERNAL_ALERTING_SNOOZE_RULE,
      options: { access: 'internal' },
      validate: {
        params: snoozeParamsSchema,
        body: snoozeBodySchema,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesClient = (await context.alerting).getRulesClient();
        const params: SnoozeRuleRequestParamsV1 = req.params;
        const body = transformSnoozeBodyV1(req.body);
        try {
          await rulesClient.snooze({ ...params, ...body });
          return res.noContent();
        } catch (e) {
          if (e instanceof RuleMutedError) {
            return e.sendResponse(res);
          }
          throw e;
        }
      })
    )
  );
};
