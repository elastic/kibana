/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { IRouter } from '@kbn/core/server';
import {
  findQuerySchemaV1,
  FindBackfillRequestQueryV1,
  FindBackfillResponseV1,
} from '../../../../../common/routes/backfill/apis/find';
import { ILicenseState } from '../../../../lib';
import { verifyAccessAndContext } from '../../../lib';
import {
  AlertingRequestHandlerContext,
  INTERNAL_ALERTING_BACKFILL_FIND_API_PATH,
} from '../../../../types';
import { transformRequestV1, transformResponseV1 } from './transforms';

export const findBackfillRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${INTERNAL_ALERTING_BACKFILL_FIND_API_PATH}`,
      validate: {
        query: findQuerySchemaV1,
      },
      options: {
        access: 'internal',
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesClient = (await context.alerting).getRulesClient();
        const query: FindBackfillRequestQueryV1 = req.query;

        const result = await rulesClient.findBackfill(transformRequestV1(query));
        const response: FindBackfillResponseV1 = {
          body: transformResponseV1(result),
        };
        return res.ok(response);
      })
    )
  );
};
