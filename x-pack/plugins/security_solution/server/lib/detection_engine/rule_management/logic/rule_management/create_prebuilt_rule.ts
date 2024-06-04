/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { PrebuiltRuleAsset } from '../../../prebuilt_rules';
import type { MlAuthz } from '../../../../machine_learning/authz';
import type { RuleAlertType } from '../../../rule_schema';
import { withSecuritySpan } from '../../../../../utils/with_security_span';

import { _validateMlAuth, _createRule } from './utils';

export interface CreatePrebuiltRuleProps {
  ruleAsset: PrebuiltRuleAsset;
}

export const createPrebuiltRule = async (
  rulesClient: RulesClient,
  createPrebuiltRulePayload: CreatePrebuiltRuleProps,
  mlAuthz: MlAuthz
): Promise<RuleAlertType> =>
  withSecuritySpan('DetectionRulesClient.createPrebuiltRule', async () => {
    const { ruleAsset } = createPrebuiltRulePayload;

    await _validateMlAuth(mlAuthz, ruleAsset.type);

    const rule = await _createRule(rulesClient, ruleAsset, {
      immutable: true,
      defaultEnabled: false,
    });

    return rule;
  });
