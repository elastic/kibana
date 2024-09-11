/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type {
  RuleCreateProps,
  RuleUpdateProps,
  RulePatchProps,
  RuleObjectId,
  RuleToImport,
  RuleResponse,
} from '../../../../../../common/api/detection_engine';
import type { PrebuiltRuleAsset } from '../../../prebuilt_rules';
import type { PrebuiltRulesImportHelper } from '../../../prebuilt_rules/logic/prebuilt_rules_import_helper';
import type { ImportRuleResponse } from '../../../routes/utils';
import type { PromiseFromStreams } from '../import/import_rules_utils';

export interface IDetectionRulesClient {
  createCustomRule: (args: CreateCustomRuleArgs) => Promise<RuleResponse>;
  createPrebuiltRule: (args: CreatePrebuiltRuleArgs) => Promise<RuleResponse>;
  updateRule: (args: UpdateRuleArgs) => Promise<RuleResponse>;
  patchRule: (args: PatchRuleArgs) => Promise<RuleResponse>;
  deleteRule: (args: DeleteRuleArgs) => Promise<void>;
  upgradePrebuiltRule: (args: UpgradePrebuiltRuleArgs) => Promise<RuleResponse>;
  importRule: (args: ImportRuleArgs) => Promise<RuleResponse>;
  importRules: (args: ImportRulesArgs) => Promise<ImportRuleResponse[]>;
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

export interface ImportRuleArgs {
  ruleToImport: RuleToImport;
  overwriteRules?: boolean;
  allowMissingConnectorSecrets?: boolean;
}

export interface ImportRulesArgs {
  ruleChunks: PromiseFromStreams[][];
  rulesResponseAcc: ImportRuleResponse[];
  overwriteRules: boolean;
  prebuiltRulesImportHelper: PrebuiltRulesImportHelper;
  allowPrebuiltRules?: boolean;
  allowMissingConnectorSecrets?: boolean;
  savedObjectsClient: SavedObjectsClientContract;
}
