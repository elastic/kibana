/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { MlAuthz } from '../../../../machine_learning/authz';

import type { RuleAlertType } from '../../../rule_schema';

import type { CreateCustomRuleProps } from './create_custom_rule';
import type { CreatePrebuiltRuleProps } from './create_prebuilt_rule';
import type { UpdateRuleProps } from './update_rule';
import type { PatchRuleProps } from './patch_rule';
import type { DeleteRuleProps } from './delete_rule';
import type { UpgradePrebuiltRuleProps } from './upgrade_prebuilt_rule';
import type { ImportRuleProps } from './import_rule';

import { createCustomRule } from './create_custom_rule';
import { createPrebuiltRule } from './create_prebuilt_rule';
import { updateRule } from './update_rule';
import { patchRule } from './patch_rule';
import { deleteRule } from './delete_rule';
import { upgradePrebuiltRule } from './upgrade_prebuilt_rule';
import { importRule } from './import_rule';

export interface IDetectionRulesClient {
  createCustomRule: (createCustomRulePayload: CreateCustomRuleProps) => Promise<RuleAlertType>;
  createPrebuiltRule: (
    createPrebuiltRulePayload: CreatePrebuiltRuleProps
  ) => Promise<RuleAlertType>;
  updateRule: (updateRulePayload: UpdateRuleProps) => Promise<RuleAlertType>;
  patchRule: (patchRulePayload: PatchRuleProps) => Promise<RuleAlertType>;
  deleteRule: (deleteRulePayload: DeleteRuleProps) => Promise<void>;
  upgradePrebuiltRule: (
    upgradePrebuiltRulePayload: UpgradePrebuiltRuleProps
  ) => Promise<RuleAlertType>;
  importRule: (importRulePayload: ImportRuleProps) => Promise<RuleAlertType>;
}

export const createDetectionRulesClient = (
  rulesClient: RulesClient,
  mlAuthz: MlAuthz
): IDetectionRulesClient => ({
  createCustomRule: async (
    createCustomRulePayload: CreateCustomRuleProps
  ): Promise<RuleAlertType> => {
    return createCustomRule(rulesClient, createCustomRulePayload, mlAuthz);
  },

  createPrebuiltRule: async (
    createPrebuiltRulePayload: CreatePrebuiltRuleProps
  ): Promise<RuleAlertType> => {
    return createPrebuiltRule(rulesClient, createPrebuiltRulePayload, mlAuthz);
  },

  updateRule: async (updateRulePayload: UpdateRuleProps): Promise<RuleAlertType> => {
    return updateRule(rulesClient, updateRulePayload, mlAuthz);
  },

  patchRule: async (patchRulePayload: PatchRuleProps): Promise<RuleAlertType> => {
    return patchRule(rulesClient, patchRulePayload, mlAuthz);
  },

  deleteRule: async (deleteRulePayload: DeleteRuleProps): Promise<void> => {
    return deleteRule(rulesClient, deleteRulePayload);
  },

  upgradePrebuiltRule: async (
    upgradePrebuiltRulePayload: UpgradePrebuiltRuleProps
  ): Promise<RuleAlertType> => {
    return upgradePrebuiltRule(rulesClient, upgradePrebuiltRulePayload, mlAuthz);
  },

  importRule: async (importRulePayload: ImportRuleProps): Promise<RuleAlertType> => {
    return importRule(rulesClient, importRulePayload, mlAuthz);
  },
});
