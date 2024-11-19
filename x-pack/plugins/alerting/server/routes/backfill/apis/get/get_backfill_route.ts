/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IRouter } from '@kbn/core/server';
import type {
  GetBackfillRequestParamsV1,
  GetBackfillResponseV1,
} from '../../../../../common/routes/backfill/apis/get';
import { getParamsSchemaV1 } from '../../../../../common/routes/backfill/apis/get';
import type { ILicenseState } from '../../../../lib';
import { verifyAccessAndContext } from '../../../lib';
import type { AlertingRequestHandlerContext } from '../../../../types';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../../../types';
import { transformBackfillToBackfillResponseV1 } from '../../transforms';

export const getBackfillRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rules/backfill/{id}`,
      options: {
        access: 'internal',
      },
      validate: {
        params: getParamsSchemaV1,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesClient = (await context.alerting).getRulesClient();
        const params: GetBackfillRequestParamsV1 = req.params;

        const result = await rulesClient.getBackfill(params.id);
        const response: GetBackfillResponseV1 = {
          body: transformBackfillToBackfillResponseV1(result),
        };
        return res.ok(response);
      })
    )
  );
};
