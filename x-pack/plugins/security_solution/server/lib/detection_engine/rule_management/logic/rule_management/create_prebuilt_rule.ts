/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { PrebuiltRuleAsset } from '../../../prebuilt_rules';
import type { MlAuthz } from '../../../../machine_learning/authz';
import type { RuleAlertType, RuleParams } from '../../../rule_schema';
import { withSecuritySpan } from '../../../../../utils/with_security_span';
import { convertCreateAPIToInternalSchema } from '../../normalization/rule_converters';

import { validateMlAuth } from './utils';

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

    await validateMlAuth(mlAuthz, ruleAsset.type);

    const internalRule = convertCreateAPIToInternalSchema(ruleAsset, {
      immutable: true,
      defaultEnabled: false,
    });

    const rule = await rulesClient.create<RuleParams>({
      data: internalRule,
    });

    return rule;
  });
