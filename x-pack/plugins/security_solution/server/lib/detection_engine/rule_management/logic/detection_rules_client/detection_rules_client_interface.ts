/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RuleCreateProps,
  RuleUpdateProps,
  RulePatchProps,
  RuleObjectId,
  RuleResponse,
  ValidatedRuleToImport,
  RuleToImport,
  RuleSource,
} from '../../../../../../common/api/detection_engine';
import type { RuleImportErrorObject } from '../import/errors';
import type { PrebuiltRuleAsset } from '../../../prebuilt_rules';
import type { PrebuiltRulesImportHelper } from '../../../prebuilt_rules/logic/prebuilt_rules_import_helper';

export interface IDetectionRulesClient {
  createCustomRule: (args: CreateCustomRuleArgs) => Promise<RuleResponse>;
  createPrebuiltRule: (args: CreatePrebuiltRuleArgs) => Promise<RuleResponse>;
  updateRule: (args: UpdateRuleArgs) => Promise<RuleResponse>;
  patchRule: (args: PatchRuleArgs) => Promise<RuleResponse>;
  deleteRule: (args: DeleteRuleArgs) => Promise<void>;
  upgradePrebuiltRule: (args: UpgradePrebuiltRuleArgs) => Promise<RuleResponse>;
  legacyImportRule: (args: LegacyImportRuleArgs) => Promise<RuleResponse>;
  importRule: (args: ImportRuleArgs) => Promise<RuleResponse>;
  importRules: (args: ImportRulesArgs) => Promise<Array<RuleResponse | RuleImportErrorObject>>;
}

export interface CreateCustomRuleArgs {
  params: RuleCreateProps;
}

export interface CreatePrebuiltRuleArgs {
  params: RuleCreateProps;
}

export interface UpdateRuleArgs {
  ruleUpdate: RuleUpdateProps;
}

export interface PatchRuleArgs {
  rulePatch: RulePatchProps;
}

export interface DeleteRuleArgs {
  ruleId: RuleObjectId;
}

export interface UpgradePrebuiltRuleArgs {
  ruleAsset: PrebuiltRuleAsset;
}

export interface LegacyImportRuleArgs {
  ruleToImport: RuleToImport;
  overwriteRules?: boolean;
  allowMissingConnectorSecrets?: boolean;
}

export interface ImportRuleArgs {
  ruleToImport: ValidatedRuleToImport & { rule_source: RuleSource; immutable: boolean };
  overwriteRules?: boolean;
  allowMissingConnectorSecrets?: boolean;
}

export interface ImportRulesArgs {
  rules: RuleToImport[];
  overwriteRules: boolean;
  prebuiltRulesImportHelper: PrebuiltRulesImportHelper;
  allowMissingConnectorSecrets?: boolean;
}
