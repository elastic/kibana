/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { ILicenseState } from '../../../../lib';
import { verifyAccessAndContext } from '../../../lib';
import {
  deleteRuleRequestParamsSchemaV1,
  DeleteRuleRequestParamsV1,
} from '../../../../../common/routes/rule/apis/delete';
import { AlertingRequestHandlerContext, BASE_ALERTING_API_PATH } from '../../../../types';

export const deleteRuleRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.delete(
    {
      path: `${BASE_ALERTING_API_PATH}/rule/{id}`,
      options: {
        access: 'public',
        summary: `Delete a rule`,
        tags: ['oas-tag:alerting'],
      },
      validate: {
        request: {
          params: deleteRuleRequestParamsSchemaV1,
        },
        response: {
          204: {
            description: 'Indicates a successful call.',
          },
          400: {
            description: 'Indicates an invalid schema or parameters.',
          },
          403: {
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
        const alertingContext = await context.alerting;
        const rulesClient = await alertingContext.getRulesClient();

        const params: DeleteRuleRequestParamsV1 = req.params;

        await rulesClient.delete({ id: params.id });
        return res.noContent();
      })
    )
  );
};
