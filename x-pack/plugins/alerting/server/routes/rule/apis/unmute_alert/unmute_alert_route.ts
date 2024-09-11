/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import {
  UnmuteAlertRequestParamsV1,
  unmuteAlertParamsSchemaV1,
} from '../../../../../common/routes/rule/apis/unmute_alert';
import { forbiddenErrorSchemaV1 } from '../../../../../common/routes/rule/common';
import { ILicenseState, RuleTypeDisabledError } from '../../../../lib';
import { AlertingRequestHandlerContext, BASE_ALERTING_API_PATH } from '../../../../types';
import { verifyAccessAndContext } from '../../../lib';
import { transformRequestParamsToApplicationV1 } from './transforms';

export const unmuteAlertRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${BASE_ALERTING_API_PATH}/rule/{rule_id}/alert/{alert_id}/_unmute`,
      options: {
        access: 'public',
        summary: `Unmute an alert`,
        tags: ['oas-tag:alerting'],
      },
      validate: {
        request: {
          params: unmuteAlertParamsSchemaV1,
        },
        response: {
          204: {
            description: 'Indicates a successful call.',
          },
          403: {
            body: () => forbiddenErrorSchemaV1,
            description: 'Indicates that this call is forbidden.',
          },
        },
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesClient = (await context.alerting).getRulesClient();
        const params: UnmuteAlertRequestParamsV1 = req.params;
        try {
          await rulesClient.unmuteInstance(transformRequestParamsToApplicationV1(params));
          return res.noContent();
        } catch (e) {
          if (e instanceof RuleTypeDisabledError) {
            return e.sendResponse(res);
          }
          throw e;
        }
      })
    )
  );
};
