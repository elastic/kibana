/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import {
  deleteBackfillRequestParamsSchemaV1,
  DeleteBackfillRequestParamsV1,
} from '../../../../../../common/routes/rule/apis/backfill/delete';
import { ILicenseState } from '../../../../../lib';
import { verifyAccessAndContext } from '../../../../lib';
import {
  AlertingRequestHandlerContext,
  INTERNAL_BASE_ALERTING_API_PATH,
} from '../../../../../types';

export const deleteBackfillRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.delete(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rules/backfill/{id}`,
      validate: {
        params: deleteBackfillRequestParamsSchemaV1,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesClient = (await context.alerting).getRulesClient();
        const params: DeleteBackfillRequestParamsV1 = req.params;

        await rulesClient.deleteBackfill(params);
        return res.noContent();
      })
    )
  );
};
