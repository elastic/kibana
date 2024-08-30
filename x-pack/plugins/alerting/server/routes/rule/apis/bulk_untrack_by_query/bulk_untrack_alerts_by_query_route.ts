/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import {
  BulkUntrackByQueryRequestBodyV1,
  bulkUntrackByQueryBodySchemaV1,
} from '../../../schemas/rule/apis/bulk_untrack_by_query';
import { ILicenseState, RuleTypeDisabledError } from '../../../../lib';
import { verifyAccessAndContext } from '../../../lib';
import { AlertingRequestHandlerContext, INTERNAL_BASE_ALERTING_API_PATH } from '../../../../types';
import { transformBulkUntrackAlertsByQueryBodyV1 } from './transforms';

export const bulkUntrackAlertsByQueryRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/alerts/_bulk_untrack_by_query`,
      validate: {
        body: bulkUntrackByQueryBodySchemaV1,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesClient = (await context.alerting).getRulesClient();
        const body: BulkUntrackByQueryRequestBodyV1 = req.body;
        try {
          await rulesClient.bulkUntrackAlerts({
            ...transformBulkUntrackAlertsByQueryBodyV1(body),
            isUsingQuery: true,
          });
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
