/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { ILicenseState, RuleMutedError } from '../lib';
import { verifyAccessAndContext } from './lib';
import { SnoozeOptions } from '../rules_client';
import { AlertingRequestHandlerContext, INTERNAL_BASE_ALERTING_API_PATH } from '../types';
import { validateSnoozeStartDate, validateSnoozeEndDate } from '../lib/validate_snooze_date';
import { createValidateRruleBy } from '../lib/validate_rrule_by';
import { validateSnoozeSchedule } from '../lib/validate_snooze_schedule';

const paramSchema = schema.object({
  id: schema.string(),
});

export const snoozeScheduleSchema = schema.object(
  {
    id: schema.maybe(schema.string()),
    duration: schema.number(),
    rRule: schema.object({
      dtstart: schema.string({ validate: validateSnoozeStartDate }),
      tzid: schema.string(),
      freq: schema.maybe(
        schema.oneOf([schema.literal(0), schema.literal(1), schema.literal(2), schema.literal(3)])
      ),
      interval: schema.maybe(
        schema.number({
          validate: (interval: number) => {
            if (interval < 1) return 'rRule interval must be > 0';
          },
        })
      ),
      until: schema.maybe(schema.string({ validate: validateSnoozeEndDate })),
      count: schema.maybe(
        schema.number({
          validate: (count: number) => {
            if (count < 1) return 'rRule count must be > 0';
          },
        })
      ),
      byweekday: schema.maybe(
        schema.arrayOf(schema.string(), {
          validate: createValidateRruleBy('byweekday'),
        })
      ),
      bymonthday: schema.maybe(
        schema.arrayOf(schema.number(), {
          validate: createValidateRruleBy('bymonthday'),
        })
      ),
      bymonth: schema.maybe(
        schema.arrayOf(schema.number(), {
          validate: createValidateRruleBy('bymonth'),
        })
      ),
    }),
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
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rule/{id}/_snooze`,
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
