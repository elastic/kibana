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
import {
  convertPatchAPIToInternalSchema,
  convertCreateAPIToInternalSchema,
} from '../../normalization/rule_converters';
import { transformAlertToRuleAction } from '../../../../../../common/detection_engine/transform_actions';

import { validateMlAuth, ClientError } from './utils';

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

    await validateMlAuth(mlAuthz, ruleAsset.type);

    const existingRule = await readRules({
      rulesClient,
      ruleId: ruleAsset.rule_id,
      id: undefined,
    });

    if (!existingRule) {
      throw new ClientError(`Failed to find rule ${ruleAsset.rule_id}`, 500);
    }

    if (ruleAsset.type !== existingRule.params.type) {
      // If we're trying to change the type of a prepackaged rule, we need to delete the old one
      // and replace it with the new rule, keeping the enabled setting, actions, throttle, id,
      // and exception lists from the old rule
      await rulesClient.delete({ id: existingRule.id });

      const internalRule = convertCreateAPIToInternalSchema(
        {
          ...ruleAsset,
          enabled: existingRule.enabled,
          exceptions_list: existingRule.params.exceptionsList,
          actions: existingRule.actions.map(transformAlertToRuleAction),
          timeline_id: existingRule.params.timelineId,
          timeline_title: existingRule.params.timelineTitle,
        },
        { immutable: true, defaultEnabled: existingRule.enabled }
      );

      return rulesClient.create<RuleParams>({
        data: internalRule,
        options: { id: existingRule.id },
      });
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
