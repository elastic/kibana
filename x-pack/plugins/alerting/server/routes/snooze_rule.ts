/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { ILicenseState, RuleMutedError } from '../lib';
import { verifyAccessAndContext, rRuleSchema } from './lib';
import { SnoozeOptions } from '../rules_client';
import { AlertingRequestHandlerContext, INTERNAL_ALERTING_SNOOZE_RULE } from '../types';
import { validateSnoozeSchedule } from '../lib/validate_snooze_schedule';

const paramSchema = schema.object({
  id: schema.string(),
});

export const snoozeScheduleSchema = schema.object(
  {
    id: schema.maybe(schema.string()),
    duration: schema.number(),
    rRule: rRuleSchema,
  },
  { validate: validateSnoozeSchedule }
);

const bodySchema = schema.object({
  snooze_schedule: snoozeScheduleSchema,
});

const rewriteBodyReq: (opts: {
  snooze_schedule: SnoozeOptions['snoozeSchedule'];
}) => SnoozeOptions = ({ snooze_schedule: snoozeSchedule }) => ({
  snoozeSchedule,
});

export const snoozeRuleRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: INTERNAL_ALERTING_SNOOZE_RULE,
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
