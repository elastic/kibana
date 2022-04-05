/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import uuid from 'uuid';
import { RuleTypeDisabledError, validateDurationSchema } from '../lib';
import { CreateOptions } from '../rules_client';
import {
  RewriteRequestCase,
  RewriteResponseCase,
  handleDisabledApiKeysError,
  verifyAccessAndContext,
} from './lib';
import { validateNotifyWhenType, BASE_ALERTING_API_PATH, RuleNotifyWhenType } from '../types';
import { RouteOptions } from '.';
import { RuleExecutionStatus, RuleTypeParams } from '../../common/rule';

export const bodySchema = schema.object({
  name: schema.string(),
  enabled: schema.boolean({ defaultValue: true }),
  rule_type_id: schema.string(),
  consumer: schema.string(),
  tags: schema.arrayOf(schema.string(), { defaultValue: [] }),
  throttle: schema.nullable(schema.string({ validate: validateDurationSchema })),
  params: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
  schedule: schema.object({
    interval: schema.string({ validate: validateDurationSchema }),
  }),
  actions: schema.arrayOf(
    schema.object({
      group: schema.string(),
      id: schema.string(),
      params: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
    }),
    { defaultValue: [] }
  ),
  notify_when: schema.string({ validate: validateNotifyWhenType }),
});

const rewriteBodyReq: RewriteRequestCase<CreateOptions<RuleTypeParams>['data']> = ({
  rule_type_id: alertTypeId,
  notify_when: notifyWhen,
  ...rest
}) => ({
  ...rest,
  alertTypeId,
  notifyWhen,
});
const rewriteBodyRes: RewriteResponseCase<RuleExecutionStatus> = ({
  numberOfTriggeredActions,
  numberOfScheduledActions,
  lastExecutionDate,
  lastDuration,
  ...rest
}) => ({
  ...rest,
  number_of_triggered_actions: numberOfTriggeredActions,
  number_of_scheduled_actions: numberOfScheduledActions,
  last_execution_date: lastExecutionDate,
  last_duration: lastDuration,
});

export const simulateRuleRoute = ({ router, licenseState, usageCounter }: RouteOptions) => {
  router.post(
    {
      path: `${BASE_ALERTING_API_PATH}/_simulate_rule`,
      validate: {
        body: bodySchema,
      },
    },
    handleDisabledApiKeysError(
      router.handleLegacyErrors(
        verifyAccessAndContext(licenseState, async function (context, req, res) {
          const rulesClient = context.alerting.getRulesClient();
          const rule = req.body;

          try {
            const id = `simulation-${rule.rule_type_id}-${uuid.v4()}`;
            const simulatedRuleExecutionStatus: RuleExecutionStatus =
              await rulesClient.simulate<RuleTypeParams>({
                data: rewriteBodyReq({
                  ...rule,
                  enabled: true,
                  notify_when: rule.notify_when as RuleNotifyWhenType,
                }),
                options: { id },
              });
            return res.ok({
              body: {
                result: rewriteBodyRes(simulatedRuleExecutionStatus),
                id,
              },
            });
          } catch (e) {
            if (e instanceof RuleTypeDisabledError) {
              return e.sendResponse(res);
            }
            throw e;
          }
        })
      )
    )
  );
};
