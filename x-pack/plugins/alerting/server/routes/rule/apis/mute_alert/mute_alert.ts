/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { IRouter } from '@kbn/core/server';
import { transformRequestParamsToApplicationV1 } from './transforms';
import { ILicenseState, RuleTypeDisabledError } from '../../../../lib';
import { verifyAccessAndContext } from '../../../lib';
import { AlertingRequestHandlerContext, BASE_ALERTING_API_PATH } from '../../../../types';
import {
  muteAlertParamsSchemaV1,
  MuteAlertRequestParamsV1,
} from '../../../schemas/rule/apis/mute_alert';

export const muteAlertRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${BASE_ALERTING_API_PATH}/rule/{rule_id}/alert/{alert_id}/_mute`,
      options: {
        access: 'public',
        summary: `Mute an alert`,
        tags: ['oas-tag:alerting'],
      },
      validate: {
        request: {
          params: muteAlertParamsSchemaV1,
        },
        response: {
          204: {
            description: 'Indicates a successful call.',
          },
        },
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesClient = (await context.alerting).getRulesClient();
        const params: MuteAlertRequestParamsV1 = req.params;
        try {
          await rulesClient.muteInstance(transformRequestParamsToApplicationV1(params));
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
