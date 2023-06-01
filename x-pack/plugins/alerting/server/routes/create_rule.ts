/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { RuleTypeDisabledError } from '../lib';
import {
  rewriteRule,
  handleDisabledApiKeysError,
  verifyAccessAndContext,
  countUsageOfPredefinedIds,
} from './lib';
import { BASE_ALERTING_API_PATH } from '../types';
import { RouteOptions } from '.';
import { ruleV1, createRuleV1 } from '../../common/types/api';
import type { CreateRuleData } from '../rules_client/methods/create';

export const rewriteActionsReq = (
  actions: createRuleV1.CreateRuleAction[]
): CreateRuleData['actions'] => {
  if (!actions) return [];

  return actions.map(({ frequency, alerts_filter: alertsFilter, ...action }) => {
    return {
      ...action,
      ...(frequency
        ? {
            frequency: {
              ...omit(frequency, 'notify_when'),
              notifyWhen: frequency.notify_when,
            },
          }
        : {}),
      ...(alertsFilter ? { alertsFilter } : {}),
    };
  });
};

const rewriteBodyReq = ({
  rule_type_id: alertTypeId,
  notify_when: notifyWhen,
  actions,
  ...rest
}: createRuleV1.CreateRuleRequestBody): CreateRuleData => ({
  ...rest,
  alertTypeId,
  notifyWhen,
  actions: rewriteActionsReq(actions),
});

export const createRuleRoute = ({ router, licenseState, usageCounter }: RouteOptions) => {
  router.post(
    {
      path: `${BASE_ALERTING_API_PATH}/rule/{id?}`,
      validate: {
        body: createRuleV1.createBodySchema,
        params: createRuleV1.createParamsSchema,
      },
    },
    handleDisabledApiKeysError(
      router.handleLegacyErrors(
        verifyAccessAndContext(licenseState, async function (context, req, res) {
          const rulesClient = (await context.alerting).getRulesClient();
          const rule = req.body as createRuleV1.CreateRuleRequestBody;
          const params = req.params as createRuleV1.CreateRuleRequestParams;

          countUsageOfPredefinedIds({
            predefinedId: params?.id,
            spaceId: rulesClient.getSpaceId(),
            usageCounter,
          });

          try {
            const createdRule: ruleV1.SanitizedRule<ruleV1.RuleParams> =
              await rulesClient.create<ruleV1.RuleParams>({
                data: rewriteBodyReq(rule),
                options: { id: params?.id },
              });

            const response: createRuleV1.CreateRuleResponse<ruleV1.RuleParams> = {
              body: rewriteRule<ruleV1.RuleParams>(createdRule),
            };

            return res.ok(response);
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
