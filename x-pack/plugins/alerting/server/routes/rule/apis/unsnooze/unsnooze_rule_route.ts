/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import { IRouter } from '@kbn/core/server';
import {
  unsnoozeBodySchema,
  unsnoozeParamsSchema,
} from '../../../../../common/routes/rule/apis/unsnooze';
import { ILicenseState, RuleMutedError } from '../../../../lib';
import { verifyAccessAndContext } from '../../../lib';
import { AlertingRequestHandlerContext, INTERNAL_BASE_ALERTING_API_PATH } from '../../../../types';
import { transformUnsnoozeBodyV1 } from './transforms';

export type UnsnoozeRuleRequestParamsV1 = TypeOf<typeof unsnoozeParamsSchema>;

export const unsnoozeRuleRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rule/{id}/_unsnooze`,
      options: { access: 'internal' },
      validate: {
        params: unsnoozeParamsSchema,
        body: unsnoozeBodySchema,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesClient = (await context.alerting).getRulesClient();
        const params: UnsnoozeRuleRequestParamsV1 = req.params;
        const body = transformUnsnoozeBodyV1(req.body);
        try {
          await rulesClient.unsnooze({ ...params, ...body });
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
