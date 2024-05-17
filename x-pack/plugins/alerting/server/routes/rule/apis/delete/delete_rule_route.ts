/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import {
  DeleteRuleRequestParamsV1,
  deleteRuleRequestParamsSchemaV1,
} from '../../../../../common/routes/rule/apis/delete';
import { ILicenseState } from '../../../../lib';
import { AlertingRequestHandlerContext, BASE_ALERTING_API_PATH } from '../../../../types';
import { verifyAccessAndContext } from '../../../lib';

export const deleteRuleRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.delete(
    {
      path: `${BASE_ALERTING_API_PATH}/rule/{id}`,
      validate: {
        params: deleteRuleRequestParamsSchemaV1,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesClient = (await context.alerting).getRulesClient();

        const params: DeleteRuleRequestParamsV1 = req.params;

        await rulesClient.delete({ id: params.id });
        return res.noContent();
      })
    )
  );
};
