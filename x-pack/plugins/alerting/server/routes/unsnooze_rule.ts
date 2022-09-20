/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { ILicenseState, RuleMutedError } from '../lib';
import { verifyAccessAndContext, RewriteRequestCase } from './lib';
import { AlertingRequestHandlerContext, INTERNAL_BASE_ALERTING_API_PATH } from '../types';

const paramSchema = schema.object({
  id: schema.string(),
});

export const scheduleIdsSchema = schema.maybe(schema.arrayOf(schema.string()));

const bodySchema = schema.object({
  schedule_ids: scheduleIdsSchema,
});

const rewriteBodyReq: RewriteRequestCase<{ scheduleIds?: string[] }> = ({
  schedule_ids: scheduleIds,
}) => (scheduleIds ? { scheduleIds } : {});

export const unsnoozeRuleRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rule/{id}/_unsnooze`,
      validate: {
        params: paramSchema,
        body: bodySchema,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesClient = (await context.alerting).getRulesClient();
        const params = req.params;
        const body = rewriteBodyReq(req.body);
        try {
          await rulesClient.unsnooze({ ...params, ...body });
          return res.noContent();
        } catch (e) {
          if (e instanceof RuleMutedError) {
            return e.sendResponse(res);
          }
          throw e;
        }
      })
    )
  );
};
