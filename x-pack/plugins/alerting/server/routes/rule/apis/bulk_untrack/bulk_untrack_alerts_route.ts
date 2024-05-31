/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { IRouter } from '@kbn/core/server';
import {
  BulkUntrackRequestBodyV1,
  bulkUntrackBodySchemaV1,
} from '../../../../../common/routes/rule/apis/bulk_untrack';
import { transformBulkUntrackAlertsBodyV1 } from './transforms';
import { ILicenseState, RuleTypeDisabledError } from '../../../../lib';
import { verifyAccessAndContext } from '../../../lib';
import { AlertingRequestHandlerContext, INTERNAL_BASE_ALERTING_API_PATH } from '../../../../types';

export const bulkUntrackAlertsRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/alerts/_bulk_untrack`,
      validate: {
        body: bulkUntrackBodySchemaV1,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesClient = (await context.alerting).getRulesClient();
        const body: BulkUntrackRequestBodyV1 = req.body;
        try {
          await rulesClient.bulkUntrackAlerts({
            ...transformBulkUntrackAlertsBodyV1(body),
            isUsingQuery: false,
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
