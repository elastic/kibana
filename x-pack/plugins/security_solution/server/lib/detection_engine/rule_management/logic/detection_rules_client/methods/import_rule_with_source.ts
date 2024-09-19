/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import { ruleTypeMappings } from '@kbn/securitysolution-rules';

import type { RuleResponse } from '../../../../../../../common/api/detection_engine/model/rule_schema';
import type { MlAuthz } from '../../../../../machine_learning/authz';
import type { IPrebuiltRuleAssetsClient } from '../../../../prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import { convertAlertingRuleToRuleResponse } from '../converters/convert_alerting_rule_to_rule_response';
import { convertRuleResponseToAlertingRule } from '../converters/convert_rule_response_to_alerting_rule';
import type { ImportRuleArgs } from '../detection_rules_client_interface';
import { applyRuleUpdate } from '../mergers/apply_rule_update';
import { applyRuleDefaults } from '../mergers/apply_rule_defaults';
import { validateMlAuth, toggleRuleEnabledOnUpdate } from '../utils';
import { getRuleByRuleId } from './get_rule_by_rule_id';
import { SERVER_APP_ID } from '../../../../../../../common';
import { createRuleImportError } from '../../import/errors';

interface ImportRuleOptions {
  actionsClient: ActionsClient;
  rulesClient: RulesClient;
  prebuiltRuleAssetClient: IPrebuiltRuleAssetsClient;
  importRulePayload: ImportRuleArgs;
  mlAuthz: MlAuthz;
}

/**
 * Imports a rule with pre-calculated `rule_source` (and `immutable`) fields.
 * Once prebuilt rule customization epic is complete, this function can be used
 * to import all rules. Until then, this function should only be used when the feature flag is enabled.
 *
 */
export const importRuleWithSource = async ({
  actionsClient,
  rulesClient,
  importRulePayload,
  prebuiltRuleAssetClient,
  mlAuthz,
}: ImportRuleOptions): Promise<RuleResponse> => {
  const { ruleToImport, overwriteRules, allowMissingConnectorSecrets } = importRulePayload;

  await validateMlAuth(mlAuthz, ruleToImport.type);

  const existingRule = await getRuleByRuleId({
    rulesClient,
    ruleId: ruleToImport.rule_id,
  });

  if (existingRule && !overwriteRules) {
    throw createRuleImportError({
      ruleId: existingRule.rule_id,
      type: 'conflict',
      message: `rule_id: "${existingRule.rule_id}" already exists`,
    });
  }

  if (existingRule && overwriteRules) {
    const ruleWithUpdates = await applyRuleUpdate({
      prebuiltRuleAssetClient,
      existingRule,
      ruleUpdate: ruleToImport,
    });
    // applyRuleUpdate prefers the existing rule's values for `rule_source` and `immutable`, but we want to use the importing rule's calculated values
    ruleWithUpdates.immutable = ruleToImport.immutable;
    ruleWithUpdates.rule_source = ruleToImport.rule_source;

    const updatedRule = await rulesClient.update({
      id: existingRule.id,
      data: convertRuleResponseToAlertingRule(ruleWithUpdates, actionsClient),
    });

    // We strip `enabled` from the rule object to use in the rules client and need to enable it separately if user has enabled the updated rule
    const { enabled } = await toggleRuleEnabledOnUpdate(rulesClient, existingRule, ruleWithUpdates);

    return convertAlertingRuleToRuleResponse({ ...updatedRule, enabled });
  }

  const ruleWithDefaults = applyRuleDefaults(ruleToImport);

  const payload = {
    ...convertRuleResponseToAlertingRule(ruleWithDefaults, actionsClient),
    alertTypeId: ruleTypeMappings[ruleToImport.type],
    consumer: SERVER_APP_ID,
    enabled: ruleToImport.enabled ?? false,
  };

  const createdRule = await rulesClient.create({
    data: payload,
    options: { id: undefined },
    allowMissingConnectorSecrets,
  });

  return convertAlertingRuleToRuleResponse(createdRule);
};
