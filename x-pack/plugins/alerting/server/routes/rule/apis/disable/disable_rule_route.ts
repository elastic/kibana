/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import {
  DisableRuleRequestBodyV1,
  DisableRuleRequestParamsV1,
  disableRuleRequestBodySchemaV1,
  disableRuleRequestParamsSchemaV1,
} from '../../../../../common/routes/rule/apis/disable';
import { forbiddenErrorSchemaV1 } from '../../../../../common/routes/rule/common';
import { ILicenseState, RuleTypeDisabledError } from '../../../../lib';
import { AlertingRequestHandlerContext, BASE_ALERTING_API_PATH } from '../../../../types';
import { verifyAccessAndContext } from '../../../lib';

export const disableRuleRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${BASE_ALERTING_API_PATH}/rule/{id}/_disable`,
      options: {
        access: 'public',
        summary: 'Disable a rule',
        tags: ['oas-tag:alerting'],
      },
      validate: {
        request: {
          params: disableRuleRequestParamsSchemaV1,
          body: disableRuleRequestBodySchemaV1,
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
        const { id }: DisableRuleRequestParamsV1 = req.params;
        const body: DisableRuleRequestBodyV1 = req.body || {};
        const { untrack = false } = body;

        const disableParams = { id, untrack };

        try {
          await rulesClient.disableRule(disableParams);
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
