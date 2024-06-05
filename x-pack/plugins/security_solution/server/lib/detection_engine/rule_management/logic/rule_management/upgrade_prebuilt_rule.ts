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
import { convertPatchAPIToInternalSchema } from '../../normalization/rule_converters';

import { _validateMlAuth, ClientError, _upgradePrebuiltRuleWithTypeChange } from './utils';

import { readRules } from './read_rules';

export interface UpgradePrebuiltRuleProps {
  ruleAsset: PrebuiltRuleAsset;
}

export const upgradePrebuiltRule = async (
  rulesClient: RulesClient,
  upgradePrebuiltRulePayload: UpgradePrebuiltRuleProps,
  mlAuthz: MlAuthz
): Promise<RuleAlertType> =>
  withSecuritySpan('DetectionRulesClient.upgradePrebuiltRule', async () => {
    const { ruleAsset } = upgradePrebuiltRulePayload;

    await _validateMlAuth(mlAuthz, ruleAsset.type);

    const existingRule = await readRules({
      rulesClient,
      ruleId: ruleAsset.rule_id,
      id: undefined,
    });

    if (!existingRule) {
      throw new ClientError(`Failed to find rule ${ruleAsset.rule_id}`, 500);
    }

    // If rule has change its type during upgrade, delete and recreate it
    if (ruleAsset.type !== existingRule.params.type) {
      return _upgradePrebuiltRuleWithTypeChange(rulesClient, ruleAsset, existingRule);
    }

    // Else, simply patch it.
    const patchedRule = convertPatchAPIToInternalSchema(ruleAsset, existingRule);

    await rulesClient.update({
      id: existingRule.id,
      data: patchedRule,
    });

    const updatedRule = await readRules({
      rulesClient,
      ruleId: ruleAsset.rule_id,
      id: undefined,
    });

    if (!updatedRule) {
      throw new ClientError(`Rule ${ruleAsset.rule_id} not found after upgrade`, 500);
    }

    return updatedRule;
  });
