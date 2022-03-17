/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from 'kibana/server';
import { schema } from '@kbn/config-schema';
import { ILicenseState, RuleMutedError } from '../lib';
import { verifyAccessAndContext, RewriteRequestCase } from './lib';
import { SnoozeOptions } from '../rules_client';
import { AlertingRequestHandlerContext, INTERNAL_BASE_ALERTING_API_PATH } from '../types';
import { validateSnoozeDate } from '../lib/validate_snooze_date';

const paramSchema = schema.object({
  id: schema.string(),
});

const bodySchema = schema.object({
  snooze_end_time: schema.oneOf([
    schema.string({
      validate: validateSnoozeDate,
    }),
    schema.literal(-1),
  ]),
});

const rewriteBodyReq: RewriteRequestCase<SnoozeOptions> = ({ snooze_end_time: snoozeEndTime }) => ({
  snoozeEndTime,
});

export const snoozeRuleRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rule/{id}/_snooze`,
      validate: {
        params: paramSchema,
        body: bodySchema,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesClient = context.alerting.getRulesClient();
        const params = req.params;
        const body = rewriteBodyReq(req.body);
        try {
          await rulesClient.snooze({ ...params, ...body });
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
