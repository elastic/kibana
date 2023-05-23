/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { validateDurationSchema, RuleTypeDisabledError } from '../lib';
import { CreateOptions } from '../rules_client';
import {
  RewriteRequestCase,
  rewriteActionsReq,
  handleDisabledApiKeysError,
  verifyAccessAndContext,
  actionsSchema,
} from './lib';
import { validateNotifyWhenType, RuleTypeParams, INTERNAL_BASE_ALERTING_API_PATH } from '../types';
import { RouteOptions } from '.';

export const bodySchema = schema.object({
  name: schema.string(),
  rule_type_id: schema.string(),
  enabled: schema.boolean({ defaultValue: true }),
  consumer: schema.string(),
  tags: schema.arrayOf(schema.string(), { defaultValue: [] }),
  throttle: schema.maybe(schema.nullable(schema.string({ validate: validateDurationSchema }))),
  params: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
  schedule: schema.object({
    interval: schema.string({ validate: validateDurationSchema }),
  }),
  actions: actionsSchema,
  notify_when: schema.maybe(
    schema.nullable(
      schema.oneOf(
        [
          schema.literal('onActionGroupChange'),
          schema.literal('onActiveAlert'),
          schema.literal('onThrottleInterval'),
        ],
        { validate: validateNotifyWhenType }
      )
    )
  ),
});

const rewriteBodyReq: RewriteRequestCase<CreateOptions<RuleTypeParams>['data']> = ({
  rule_type_id: alertTypeId,
  notify_when: notifyWhen,
  actions,
  ...rest
}): CreateOptions<RuleTypeParams>['data'] => ({
  ...rest,
  alertTypeId,
  notifyWhen,
  actions: rewriteActionsReq(actions),
});

export const previewRuleRoute = ({ router, licenseState }: RouteOptions) => {
  router.post(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rule/_preview`,
      validate: {
        body: bodySchema,
      },
    },
    handleDisabledApiKeysError(
      router.handleLegacyErrors(
        verifyAccessAndContext(licenseState, async function (context, req, res) {
          const rulesClient = (await context.alerting).getRulesClient();
          const rule = req.body;

          try {
            const data = await rulesClient.preview({
              data: rewriteBodyReq(rule),
            });
            return res.ok({
              body: data,
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
