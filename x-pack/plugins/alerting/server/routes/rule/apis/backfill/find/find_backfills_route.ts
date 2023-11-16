/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import {
  findBackfillsRequestBodySchemaV1,
  FindBackfillsRequestBodyV1,
} from '../../../../../../common/routes/rule/apis/backfill/find';
import { ILicenseState } from '../../../../../lib';
import { verifyAccessAndContext } from '../../../../lib';
import {
  AlertingRequestHandlerContext,
  INTERNAL_BASE_ALERTING_API_PATH,
} from '../../../../../types';
import { transformRequestV1 } from './transforms';

export const findBackfillsRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rules/backfill/_find`,
      validate: {
        body: findBackfillsRequestBodySchemaV1,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesClient = (await context.alerting).getRulesClient();
        const body: FindBackfillsRequestBodyV1 = req.body;

        const result = await rulesClient.findBackfills(transformRequestV1(body));
        // const response: FindBackfillsResponseV1 = {
        //   body: transformResponseV1(result),
        // };
        // return res.ok(response);
        return res.ok({
          body: result,
        });
      })
    )
  );
};
