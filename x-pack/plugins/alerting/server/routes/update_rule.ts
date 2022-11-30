/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from '@kbn/core/server';
import camelcaseKeys from 'camelcase-keys';
import snakecaseKeys from 'snakecase-keys';
import { ILicenseState, RuleTypeDisabledError, validateDurationSchema } from '../lib';
import {
  verifyAccessAndContext,
  handleDisabledApiKeysError,
  actionsSchema,
  ruleToAlert,
  alertToRule,
} from './lib';
import {
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
            const alertRes = await rulesClient.update({
              id,
              // @ts-ignore
              data: camelcaseKeys(ruleToAlert(rule)),
            });
            return res.ok({
              // @ts-ignore
              body: snakecaseKeys(alertToRule(alertRes)),
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
