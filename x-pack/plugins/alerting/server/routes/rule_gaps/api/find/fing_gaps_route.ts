/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { IRouter } from '@kbn/core/server';
import {
  findQuerySchemaV1,
  FindGapsRequestQueryV1,
  FindGapsResponseV1,
} from '../../../../../common/routes/gaps/apis/find';
import { ILicenseState } from '../../../../lib';
import { verifyAccessAndContext } from '../../../lib';
import {
  AlertingRequestHandlerContext,
  INTERNAL_ALERTING_GAPS_FIND_API_PATH,
} from '../../../../types';

export const findGapsRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${INTERNAL_ALERTING_GAPS_FIND_API_PATH}`,
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
        const query: FindGapsRequestQueryV1 = req.query;

        const result = await rulesClient.findGaps(transformRequestV1(query));
        const response: FindGapsResponseV1 = {
          body: transformResponseV1(result),
        };
        return res.ok(response);
      })
    )
  );
};
