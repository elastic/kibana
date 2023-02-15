/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from '@kbn/core/server';
import { ILicenseState, RuleTypeDisabledError, validateDurationSchema } from '../lib';
import { RuleNotifyWhenType } from '../../common';
import { UpdateOptions } from '../rules_client';
import {
  verifyAccessAndContext,
  RewriteRequestCase,
  handleDisabledApiKeysError,
  rewriteActionsReq,
  actionsSchema,
  rewritePartialRule,
} from './lib';
import {
  RuleTypeParams,
  AlertingRequestHandlerContext,
  BASE_ALERTING_API_PATH,
  validateNotifyWhenType,
} from '../types';

const paramSchema = schema.object({
  id: schema.string(),
});

const bodySchema = schema.object({
  name: schema.string(),
  tags: schema.arrayOf(schema.string(), { defaultValue: [] }),
  schedule: schema.object({
    interval: schema.string({ validate: validateDurationSchema }),
  }),
  throttle: schema.nullable(schema.maybe(schema.string({ validate: validateDurationSchema }))),
  params: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
  actions: actionsSchema,
  notify_when: schema.maybe(schema.string({ validate: validateNotifyWhenType })),
});

const rewriteBodyReq: RewriteRequestCase<UpdateOptions<RuleTypeParams>> = (result) => {
  const { notify_when: notifyWhen, actions, ...rest } = result.data;
  return {
    ...result,
    data: {
      ...rest,
      notifyWhen,
      actions: rewriteActionsReq(actions),
    },
  };
};

export const updateRuleRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.put(
    {
      path: `${BASE_ALERTING_API_PATH}/rule/{id}`,
      validate: {
        body: bodySchema,
        params: paramSchema,
      },
    },
    handleDisabledApiKeysError(
      router.handleLegacyErrors(
        verifyAccessAndContext(licenseState, async function (context, req, res) {
          const rulesClient = (await context.alerting).getRulesClient();
          const { id } = req.params;
          const rule = req.body;
          try {
            const alertRes = await rulesClient.update(
              rewriteBodyReq({
                id,
                data: {
                  ...rule,
                  notify_when: rule.notify_when as RuleNotifyWhenType,
                },
              })
            );
            return res.ok({
              body: rewritePartialRule(alertRes),
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
