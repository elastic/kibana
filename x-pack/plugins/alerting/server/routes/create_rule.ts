/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import camelcaseKeys from 'camelcase-keys';
import snakecaseKeys from 'snakecase-keys';
import { alertToRule, ruleToAlert } from './lib';
import { validateDurationSchema, RuleTypeDisabledError } from '../lib';
import {
  handleDisabledApiKeysError,
  verifyAccessAndContext,
  countUsageOfPredefinedIds,
  actionsSchema,
} from './lib';
import {
  SanitizedRule,
  validateNotifyWhenType,
  RuleTypeParams,
  BASE_ALERTING_API_PATH,
} from '../types';
import { RouteOptions } from '.';

export const bodySchema = schema.object({
  name: schema.string(),
  rule_type_id: schema.string(),
  enabled: schema.boolean({ defaultValue: true }),
  consumer: schema.string(),
  tags: schema.arrayOf(schema.string(), { defaultValue: [] }),
  throttle: schema.nullable(schema.maybe(schema.string({ validate: validateDurationSchema }))),
  params: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
  schedule: schema.object({
    interval: schema.string({ validate: validateDurationSchema }),
  }),
  actions: actionsSchema,
  notify_when: schema.maybe(schema.string({ validate: validateNotifyWhenType })),
});

export const createRuleRoute = ({ router, licenseState, usageCounter }: RouteOptions) => {
  router.post(
    {
      path: `${BASE_ALERTING_API_PATH}/rule/{id?}`,
      validate: {
        params: schema.maybe(
          schema.object({
            id: schema.maybe(schema.string()),
          })
        ),
        body: bodySchema,
      },
    },
    handleDisabledApiKeysError(
      router.handleLegacyErrors(
        verifyAccessAndContext(licenseState, async function (context, req, res) {
          const rulesClient = (await context.alerting).getRulesClient();
          const rule = req.body;
          const params = req.params;

          countUsageOfPredefinedIds({
            predefinedId: params?.id,
            spaceId: rulesClient.getSpaceId(),
            usageCounter,
          });

          try {
            const createdRule: SanitizedRule<RuleTypeParams> =
              await rulesClient.create<RuleTypeParams>({
                // @ts-ignore
                data: camelcaseKeys(ruleToAlert(rule)),
                options: { id: params?.id },
              });
            return res.ok({
              body: snakecaseKeys(alertToRule(createdRule)),
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
