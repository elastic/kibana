/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { validateDurationSchema } from '../lib';
import { verifyAccessAndContext } from './lib';
import {
  validateNotifyWhenType,
  RuleTypeParams,
  RuleConfigurationExplanation,
  BASE_ALERTING_API_PATH,
} from '../types';
import { RouteOptions } from '.';

// NOTE: These are just copied from createRule, probably only needs params and rule_type_id really.
export const bodySchema = schema.object({
  name: schema.string(),
  rule_type_id: schema.string(),
  enabled: schema.boolean({ defaultValue: true }),
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

export const explainRuleRoute = ({ router, licenseState }: RouteOptions) => {
  router.post(
    {
      path: `${BASE_ALERTING_API_PATH}/explain_rule`,
      validate: {
        params: schema.maybe(
          schema.object({
            id: schema.maybe(schema.string()),
          })
        ),
        body: bodySchema,
      },
    },

    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesClient = (await context.alerting).getRulesClient();
        const {
          elasticsearch: { client: esClient },
          savedObjects: { client: savedObjectsClient },
        } = await context.core;
        const rule = req.body;

        try {
          const ruleExplanation: RuleConfigurationExplanation =
            await rulesClient.explain<RuleTypeParams>({
              ruleTypeId: rule.rule_type_id,
              params: rule.params,
              esClient,
              savedObjectsClient,
            });
          return res.ok({
            body: ruleExplanation,
          });
        } catch (e) {
          throw e;
        }
      })
    )
  );
};
