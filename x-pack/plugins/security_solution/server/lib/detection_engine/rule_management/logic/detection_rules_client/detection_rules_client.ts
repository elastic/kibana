/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { MlAuthz } from '../../../../machine_learning/authz';

import type { RuleAlertType } from '../../../rule_schema';
import type {
  IDetectionRulesClient,
  CreateCustomRuleArgs,
  CreatePrebuiltRuleArgs,
  UpdateRuleArgs,
  PatchRuleArgs,
  DeleteRuleArgs,
  UpgradePrebuiltRuleArgs,
  ImportRuleArgs,
} from './detection_rules_client_interface';

import { createCustomRule } from './methods/create_custom_rule';
import { createPrebuiltRule } from './methods/create_prebuilt_rule';
import { updateRule } from './methods/update_rule';
import { patchRule } from './methods/patch_rule';
import { deleteRule } from './methods/delete_rule';
import { upgradePrebuiltRule } from './methods/upgrade_prebuilt_rule';
import { importRule } from './methods/import_rule';

import { withSecuritySpan } from '../../../../../utils/with_security_span';

export const createDetectionRulesClient = (
  rulesClient: RulesClient,
  mlAuthz: MlAuthz
): IDetectionRulesClient => ({
  async createCustomRule(args: CreateCustomRuleArgs): Promise<RuleAlertType> {
    return withSecuritySpan('DetectionRulesClient.createCustomRule', async () => {
      return createCustomRule(rulesClient, args, mlAuthz);
    });
  },

  async createPrebuiltRule(args: CreatePrebuiltRuleArgs): Promise<RuleAlertType> {
    return withSecuritySpan('DetectionRulesClient.createPrebuiltRule', async () => {
      return createPrebuiltRule(rulesClient, args, mlAuthz);
    });
  },

  async updateRule(args: UpdateRuleArgs): Promise<RuleAlertType> {
    return withSecuritySpan('DetectionRulesClient.updateRule', async () => {
      return updateRule(rulesClient, args, mlAuthz);
    });
  },

  async patchRule(args: PatchRuleArgs): Promise<RuleAlertType> {
    return withSecuritySpan('DetectionRulesClient.patchRule', async () => {
      return patchRule(rulesClient, args, mlAuthz);
    });
  },

  async deleteRule(args: DeleteRuleArgs): Promise<void> {
    return withSecuritySpan('DetectionRulesClient.deleteRule', async () => {
      return deleteRule(rulesClient, args);
    });
  },

  async upgradePrebuiltRule(args: UpgradePrebuiltRuleArgs): Promise<RuleAlertType> {
    return withSecuritySpan('DetectionRulesClient.upgradePrebuiltRule', async () => {
      return upgradePrebuiltRule(rulesClient, args, mlAuthz);
    });
  },

  async importRule(args: ImportRuleArgs): Promise<RuleAlertType> {
    return withSecuritySpan('DetectionRulesClient.importRule', async () => {
      return importRule(rulesClient, args, mlAuthz);
    });
  },
});
