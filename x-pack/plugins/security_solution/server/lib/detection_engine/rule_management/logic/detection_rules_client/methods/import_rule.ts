/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { RuleResponse } from '../../../../../../../common/api/detection_engine/model/rule_schema';
import type { MlAuthz } from '../../../../../machine_learning/authz';
import type { IPrebuiltRuleAssetsClient } from '../../../../prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import { createBulkErrorObject } from '../../../../routes/utils';
import { convertAlertingRuleToRuleResponse } from '../converters/convert_alerting_rule_to_rule_response';
import { convertRuleResponseToAlertingRule } from '../converters/convert_rule_response_to_alerting_rule';
import type { ImportRuleArgs } from '../detection_rules_client_interface';
import { applyRuleUpdate } from '../mergers/apply_rule_update';
import { validateMlAuth } from '../utils';
import { createRule } from './create_rule';
import { getRuleByRuleId } from './get_rule_by_rule_id';

interface ImportRuleOptions {
  rulesClient: RulesClient;
  prebuiltRuleAssetClient: IPrebuiltRuleAssetsClient;
  importRulePayload: ImportRuleArgs;
  mlAuthz: MlAuthz;
}

export const importRule = async ({
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
    throw createBulkErrorObject({
      ruleId: existingRule.rule_id,
      statusCode: 409,
      message: `rule_id: "${existingRule.rule_id}" already exists`,
    });
  }

  if (existingRule && overwriteRules) {
    const ruleWithUpdates = await applyRuleUpdate({
      prebuiltRuleAssetClient,
      existingRule,
      ruleUpdate: ruleToImport,
    });

    const updatedRule = await rulesClient.update({
      id: existingRule.id,
      data: convertRuleResponseToAlertingRule(ruleWithUpdates),
    });
    return convertAlertingRuleToRuleResponse(updatedRule);
  }

  /* Rule does not exist, so we'll create it */
  return createRule({
    rulesClient,
    mlAuthz,
    rule: ruleToImport,
    allowMissingConnectorSecrets,
  });
};
