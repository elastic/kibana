/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { SavedObjectsClientContract } from '@kbn/core/server';

import type { RuleResponse } from '../../../../../../common/api/detection_engine/model/rule_schema';
import { withSecuritySpan } from '../../../../../utils/with_security_span';
import type { MlAuthz } from '../../../../machine_learning/authz';
import { createPrebuiltRuleAssetsClient } from '../../../prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import type { RuleImportErrorObject } from '../import/errors';
import type {
  CreateCustomRuleArgs,
  CreatePrebuiltRuleArgs,
  DeleteRuleArgs,
  IDetectionRulesClient,
  ImportRuleArgs,
  ImportRulesArgs,
  PatchRuleArgs,
  UpdateRuleArgs,
  UpgradePrebuiltRuleArgs,
} from './detection_rules_client_interface';
import { createRule } from './methods/create_rule';
import { deleteRule } from './methods/delete_rule';
import { importRule } from './methods/import_rule';
import { patchRule } from './methods/patch_rule';
import { updateRule } from './methods/update_rule';
import { upgradePrebuiltRule } from './methods/upgrade_prebuilt_rule';
import { importRules } from './methods/import_rules';

interface DetectionRulesClientParams {
  actionsClient: ActionsClient;
  rulesClient: RulesClient;
  savedObjectsClient: SavedObjectsClientContract;
  mlAuthz: MlAuthz;
}

export const createDetectionRulesClient = ({
  actionsClient,
  rulesClient,
  mlAuthz,
  savedObjectsClient,
}: DetectionRulesClientParams): IDetectionRulesClient => {
  const prebuiltRuleAssetClient = createPrebuiltRuleAssetsClient(savedObjectsClient);

  return {
    async createCustomRule(args: CreateCustomRuleArgs): Promise<RuleResponse> {
      return withSecuritySpan('DetectionRulesClient.createCustomRule', async () => {
        return createRule({
          actionsClient,
          rulesClient,
          rule: {
            ...args.params,
            // For backwards compatibility, we default to true if not provided.
            // The default enabled value is false for prebuilt rules, and true
            // for custom rules.
            enabled: args.params.enabled ?? true,
            immutable: false,
          },
          mlAuthz,
        });
      });
    },

    async createPrebuiltRule(args: CreatePrebuiltRuleArgs): Promise<RuleResponse> {
      return withSecuritySpan('DetectionRulesClient.createPrebuiltRule', async () => {
        return createRule({
          actionsClient,
          rulesClient,
          rule: {
            ...args.params,
            immutable: true,
          },
          mlAuthz,
        });
      });
    },

    async updateRule({ ruleUpdate }: UpdateRuleArgs): Promise<RuleResponse> {
      return withSecuritySpan('DetectionRulesClient.updateRule', async () => {
        return updateRule({
          actionsClient,
          rulesClient,
          prebuiltRuleAssetClient,
          mlAuthz,
          ruleUpdate,
        });
      });
    },

    async patchRule({ rulePatch }: PatchRuleArgs): Promise<RuleResponse> {
      return withSecuritySpan('DetectionRulesClient.patchRule', async () => {
        return patchRule({
          actionsClient,
          rulesClient,
          prebuiltRuleAssetClient,
          mlAuthz,
          rulePatch,
        });
      });
    },

    async deleteRule({ ruleId }: DeleteRuleArgs): Promise<void> {
      return withSecuritySpan('DetectionRulesClient.deleteRule', async () => {
        return deleteRule({ rulesClient, ruleId });
      });
    },

    async upgradePrebuiltRule({ ruleAsset }: UpgradePrebuiltRuleArgs): Promise<RuleResponse> {
      return withSecuritySpan('DetectionRulesClient.upgradePrebuiltRule', async () => {
        return upgradePrebuiltRule({
          actionsClient,
          rulesClient,
          ruleAsset,
          mlAuthz,
          prebuiltRuleAssetClient,
        });
      });
    },

    async importRule(args: ImportRuleArgs): Promise<RuleResponse> {
      return withSecuritySpan('DetectionRulesClient.importRule', async () => {
        return importRule({
          actionsClient,
          rulesClient,
          importRulePayload: args,
          mlAuthz,
          prebuiltRuleAssetClient,
        });
      });
    },

    async importRules(args: ImportRulesArgs): Promise<Array<RuleResponse | RuleImportErrorObject>> {
      return withSecuritySpan('DetectionRulesClient.importRules', async () => {
        return importRules({
          ...args,
          detectionRulesClient: this,
          savedObjectsClient,
        });
      });
    },
  };
};
