/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import {
  UpdateApiKeyParamsV1,
  updateApiKeyParamsSchemaV1,
} from '../../../../../common/routes/rule/apis/update_api_key';
import { forbiddenErrorSchemaV1 } from '../../../../../common/routes/rule/common';
import { ILicenseState, RuleTypeDisabledError } from '../../../../lib';
import { AlertingRequestHandlerContext, BASE_ALERTING_API_PATH } from '../../../../types';
import { verifyAccessAndContext } from '../../../lib';

export const updateRuleApiKeyRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${BASE_ALERTING_API_PATH}/rule/{id}/_update_api_key`,
      options: {
        access: 'public',
        summary: 'Update the API key for a rule',
        tags: ['oas-tag:alerting'],
      },
      validate: {
        request: {
          params: updateApiKeyParamsSchemaV1,
        },
        response: {
          204: {
            description: 'Indicates a successful call.',
          },
          403: {
            body: () => forbiddenErrorSchemaV1,
            description: 'Indicates that this call is forbidden.',
          },
          404: {
            description: 'Indicates a rule with the given ID does not exist.',
          },
        },
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesClient = (await context.alerting).getRulesClient();
        const { id }: UpdateApiKeyParamsV1 = req.params;

        try {
          await rulesClient.updateRuleApiKey({ id });
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
