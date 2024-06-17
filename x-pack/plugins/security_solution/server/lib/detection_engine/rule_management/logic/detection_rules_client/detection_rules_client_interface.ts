/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleCreateProps } from '../../../../../../common/api/detection_engine/model/rule_schema';
import type { PrebuiltRuleAsset } from '../../../prebuilt_rules';
import type {
  RuleUpdateProps,
  RulePatchProps,
  RuleObjectId,
  RuleToImport,
} from '../../../../../../common/api/detection_engine';
import type { RuleAlertType } from '../../../rule_schema';

export interface IDetectionRulesClient {
  createCustomRule: (createCustomRulePayload: CreateCustomRuleArgs) => Promise<RuleAlertType>;
  createPrebuiltRule: (createPrebuiltRulePayload: CreatePrebuiltRuleArgs) => Promise<RuleAlertType>;
  updateRule: (updateRulePayload: UpdateRuleArgs) => Promise<RuleAlertType>;
  patchRule: (patchRulePayload: PatchRuleArgs) => Promise<RuleAlertType>;
  deleteRule: (deleteRulePayload: DeleteRuleArgs) => Promise<void>;
  upgradePrebuiltRule: (
    upgradePrebuiltRulePayload: UpgradePrebuiltRuleArgs
  ) => Promise<RuleAlertType>;
  importRule: (importRulePayload: ImportRuleArgs) => Promise<RuleAlertType>;
}

export interface CreateCustomRuleArgs {
  params: RuleCreateProps;
}

export interface CreatePrebuiltRuleArgs {
  ruleAsset: PrebuiltRuleAsset;
}

export interface UpdateRuleArgs {
  ruleUpdate: RuleUpdateProps;
}

export interface PatchRuleArgs {
  nextParams: RulePatchProps;
}

export interface DeleteRuleArgs {
  ruleId: RuleObjectId;
}

export interface UpgradePrebuiltRuleArgs {
  ruleAsset: PrebuiltRuleAsset;
}

export interface ImportRuleArgs {
  ruleToImport: RuleToImport;
  overwriteRules?: boolean;
  allowMissingConnectorSecrets?: boolean;
}
