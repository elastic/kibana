/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { RuleTypeDisabledError } from '../lib';
import {
  handleDisabledApiKeysError,
  verifyAccessAndContext,
  countUsageOfPredefinedIds,
} from './lib';
import { BASE_ALERTING_API_PATH } from '../types';
import { RouteOptions } from '.';
import { createRuleSchemasV1 } from '../../common/api_schemas';
import { ruleV1, createRuleV1 } from '../../common/types/api';
import { SanitizedRule, RuleParams } from '../common/types';
import type { CreateRuleData } from '../rules_client/methods/create';
import { transformPublicRuleToResponse } from '../common/transforms';

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
        body: createRuleSchemasV1.createBodySchema,
        params: createRuleSchemasV1.createParamsSchema,
      },
    },
    handleDisabledApiKeysError(
      router.handleLegacyErrors(
        verifyAccessAndContext(licenseState, async function (context, req, res) {
          const rulesClient = (await context.alerting).getRulesClient();

          // Assert versioned inputs
          const createRuleData: createRuleV1.CreateRuleRequestBody = req.body;
          const params: createRuleV1.CreateRuleRequestParams = req.params;

          countUsageOfPredefinedIds({
            predefinedId: params?.id,
            spaceId: rulesClient.getSpaceId(),
            usageCounter,
          });

          try {
            const createdRule: SanitizedRule<RuleParams> = await rulesClient.create<RuleParams>({
              data: rewriteBodyReq(createRuleData),
              options: { id: params?.id },
            });

            // Assert versioned response type
            const response: createRuleV1.CreateRuleResponse<ruleV1.RuleParams> = {
              body: transformPublicRuleToResponse<ruleV1.RuleParams>(createdRule),
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
