/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * EXISTING METHODS:
 * - createRules: FILEPATH: detection_engine/rule_management/logic/crud/create_rules.ts
 *    - createRuleRoute - POST /api/detection_engine/rules (CREATE CUSTOM RULE)
 *    - bulkCreateRulesRoute - POST /api/detection_engine/rules/_bulk_create (BULK CREATE CUSTOM RULE))
 *    - createPrebuiltRules - FILEPATH: detection_engine/prebuilt_rules/logic/rule_objects/create_prebuilt_rules.ts
 *      - installPrebuiltRulesAndTimelinesRoute - (LEGACY) /api/detection_engine/rules/prepackaged (LEGACY - INSTALL NEW PREBUILT RULES)
 *      - performRuleInstallationRoute - /internal/detection_engine/prebuilt_rules/installation/_perform (INSTALL NEW PREBUILT RULES))
 *    - upgradeRule and upgradePrebuiltRules - FILEPATH: detection_engine/prebuilt_rules/logic/rule_objects/upgrade_prebuilt_rules.ts
 *      - installPrebuiltRulesAndTimelinesRoute - (LEGACY) /api/detection_engine/rules/prepackaged (LEGACY - UPGRADE RULE WITH TYPE CHANGE)
 *      - performRuleUpgradeRoute - /internal/detection_engine/prebuilt_rules/upgrade/_perform (UPGRADE RULE WITH TYPE CHANGE)
 *    - importRules - FILEPATH: detection_engine/rule_management/logic/import/import_rules_utils.ts
 *      - importRulesRoute - POST /api/detection_engine/rules/_import (IMPORT NON EXISTING RULE CASE)
 *
 * - updateRules: FILEPATH: detection_engine/rule_management/logic/crud/update_rules.ts
 *    - updateRuleRoute - PUT /api/detection_engine/rules (UPDATE RULE)
 *    - bulkUpdateRulesRoute - PUT /api/detection_engine/rules/_bulk_update (BULK UPDATE RULE)
 *    - importRules - FILEPATH: detection_engine/rule_management/logic/import/import_rules_utils.ts
 *      - importRulesRoute - POST /api/detection_engine/rules/_import (IMPORT EXISTING RULE - with override option)
 *
 * - patchRules: FILEPATH: detection_engine/rule_management/logic/crud/patch_rules.ts
 *    - upgradeRule and upgradePrebuiltRules - FILEPATH: detection_engine/prebuilt_rules/logic/rule_objects/upgrade_prebuilt_rules.ts
 *      - installPrebuiltRulesAndTimelinesRoute - /api/detection_engine/rules/prepackaged (LEGACY - UPGRADE RULE OF SAME TYPE)
 *      - performRuleUpgradeRoute - POST /internal/detection_engine/prebuilt_rules/upgrade/_perform (UPGRADE RULE OF SAME TYPE)
 *    - patchRuleRoute - PATCH /api/detection_engine/rules - (PATCH RULE)
 *    - bulkPatchRulesRoute - PATCH /api/detection_engine/rules/_bulk_update - (BULK PATCH RULES)
 *    - createRuleExceptionsRoute - POST /api/detection_engine/rules/{id}/exceptions - (CREATE RULE EXCEPTIONS)
 *
 * - deleteRules: FILEPATH: detection_engine/rule_management/logic/crud/delete_rules.ts
 *  - deleteRuleRoute - DELETE /api/detection_engine/rules - (DELETE RULE)
 *  - bulkDeleteRulesRoute - DELETE and POST /api/detection_engine/rules/_bulk_delete - (LEGACY - BULK DELETE RULES)
 *  - performBulkActionRoute - POST /api/detection_engine/rules/_bulk_action - (BULK DELETE RULES)
 *  - upgradeRule and upgradePrebuiltRules - FILEPATH: detection_engine/prebuilt_rules/logic/rule_objects/upgrade_prebuilt_rules.ts
 *    - installPrebuiltRulesAndTimelinesRoute - (LEGACY) /api/detection_engine/rules/prepackaged (LEGACY - UPGRADE RULE WITH TYPE CHANGE)
 *    - performRuleUpgradeRoute - /internal/detection_engine/prebuilt_rules/upgrade/_perform (UPGRADE RULE WITH TYPE CHANGE)
 *
 * - readRules: FILEPATH: detection_engine/rule_management/logic/read/read_rules.ts
 *  - etc..
 *
 * USE CASES:
 *  1.  CREATE CUSTOM RULE ✅
 *  2.  BULK CREATE CUSTOM RULES ✅ by 1
 *  3.  UPDATE RULE ✅
 *  4.  BULK UPDATE RULES ✅ by 3
 *  5.  PATCH RULE ✅
 *  6.  BULK PATCH RULES ✅ by 5
 *  7.  DELETE RULE ✅
 *  8.  BULK DELETE RULES ✅ by 7
 *  9.  INSTALL NEW PREBUILT RULES ✅
 *  10. UPGRADE PREBUILT RULE WITH TYPE CHANGE
 *  11. UPGRADE PREBUILT RULE OF SAME TYPE
 *  12. IMPORT NON EXISTING RULE
 *  13. IMPORT EXISTING RULE - with override option
 *  14. CREATE RULE EXCEPTIONS
 *
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import type {
  PatchRuleRequestBody,
  RuleCreateProps,
  RuleObjectId,
  RuleUpdateProps,
} from '../../../../../../common/api/detection_engine';
import { convertCreateAPIToInternalSchema } from '../..';
import type { RuleAlertType, RuleParams, RuleSourceCamelCased } from '../../../rule_schema';
import type { PrebuiltRuleAsset } from '../../../prebuilt_rules';
import {
  convertPatchAPIToInternalSchema,
  convertUpdateAPIToInternalSchema,
} from '../../normalization/rule_converters';
import { readRules } from './read_rules';
import { PrepackagedRulesError } from '../../../prebuilt_rules/api/install_prebuilt_rules_and_timelines/install_prebuilt_rules_and_timelines_route';

interface ClientProps {
  rulesClient: RulesClient;
}

interface CreateCustomRuleProps extends ClientProps {
  params: RuleCreateProps;
}
interface CreatePrebuiltRuleProps extends ClientProps {
  ruleAsset: PrebuiltRuleAsset;
}

interface UpdateRuleProps extends ClientProps {
  existingRule: RuleAlertType | null;
  ruleUpdate: RuleUpdateProps;
}

interface PatchRuleProps extends ClientProps {
  existingRule: RuleAlertType | null;
  nextParams: PatchRuleRequestBody;
}

interface DeleteRuleProps {
  ruleId: RuleObjectId;
}

interface UpgradePrebuiltRuleProps extends ClientProps {
  ruleAsset: PrebuiltRuleAsset;
}

// TODOs:
// 1. Refactor `convertCreateAPIToInternalSchema` to take a first argument of input/params and then options object

export const getRulesManagementClient = () => {
  return {
    // 1.  CREATE CUSTOM RULE
    // Need to pass enabled flag?
    createCustomRule: async (
      createCustomRulePayload: CreateCustomRuleProps
    ): Promise<RuleAlertType> => {
      const { rulesClient, params } = createCustomRulePayload;

      const internalRule = convertCreateAPIToInternalSchema(params, { immutable: false });
      const rule = await rulesClient.create<RuleParams>({
        data: internalRule,
      });

      // TODO: Remove
      // const normalizedRule = normalizeRule(rule);

      return rule;
    },

    // 2.  BULK CREATE CUSTOM RULES
    bulkCreateCustomRules: () => {
      // API handler loops over istances of createCustomRule
    },

    // 9. INSTALL NEW PREBUILT RULES
    createPrebuiltRule: async (
      createPrebuiltRulePayload: CreatePrebuiltRuleProps
    ): Promise<RuleAlertType> => {
      const { rulesClient, ruleAsset } = createPrebuiltRulePayload;

      const internalRule = convertCreateAPIToInternalSchema(ruleAsset, {
        immutable: true,
        defaultEnabled: false,
      });
      const rule = await rulesClient.create<RuleParams>({
        data: internalRule,
      });

      // TODO: Remove
      // const normalizedRule = normalizeRule(rule);

      return rule;
    },

    // 3.  UPDATE RULE
    updateRule: async (updateRulePayload: UpdateRuleProps): Promise<RuleAlertType | null> => {
      const { rulesClient, ruleUpdate, existingRule } = updateRulePayload;

      if (existingRule == null) {
        return null;
      }

      const newInternalRule = convertUpdateAPIToInternalSchema({
        existingRule,
        ruleUpdate,
      });

      const update = await rulesClient.update({
        id: existingRule.id,
        data: newInternalRule,
      });

      const enabled = ruleUpdate.enabled ?? true;

      if (existingRule.enabled && enabled === false) {
        await rulesClient.disable({ id: existingRule.id });
      } else if (!existingRule.enabled && enabled === true) {
        await rulesClient.enable({ id: existingRule.id });
      }
      return { ...update, enabled };
    },

    // 5.  PATCH RULE
    patchRule: async (patchRulePayload: PatchRuleProps): Promise<RuleAlertType | null> => {
      const { rulesClient, nextParams, existingRule } = patchRulePayload;

      if (existingRule == null) {
        return null;
      }

      const patchedRule = convertPatchAPIToInternalSchema(nextParams, existingRule);

      const update = await rulesClient.update({
        id: existingRule.id,
        data: patchedRule,
      });

      if (existingRule.enabled && nextParams.enabled === false) {
        await rulesClient.disable({ id: existingRule.id });
      } else if (!existingRule.enabled && nextParams.enabled === true) {
        await rulesClient.enable({ id: existingRule.id });
      } else {
        // enabled is null or undefined and we do not touch the rule
      }

      if (nextParams.enabled != null) {
        return { ...update, enabled: nextParams.enabled };
      } else {
        return update;
      }
    },

    // 7.  DELETE RULE
    deleteRule: async (deleteRulePayload: DeleteRuleProps): Promise<void> => {
      const { rulesClient, ruleId } = deleteRulePayload;
      await rulesClient.delete({ id: ruleId });
    },

    // 10. AND 11. UPGRADE PREBUILT RULE
    upgradePrebuiltRule: async (
      upgradePrebuiltRulePayload: UpgradePrebuiltRuleProps
    ): Promise<RuleAlertType> => {
      const { rulesClient, ruleAsset } = upgradePrebuiltRulePayload;
      const existingRule = await readRules({
        rulesClient,
        ruleId: ruleAsset.rule_id,
        id: undefined,
      });

      if (!existingRule) {
        throw new PrepackagedRulesError(`Failed to find rule ${ruleAsset.rule_id}`, 500);
      }

      // If we're trying to change the type of a prepackaged rule, we need to delete the old one
      // and replace it with the new rule, keeping the enabled setting, actions, throttle, id,
      // and exception lists from the old rule
      if (ruleAsset.type !== existingRule.params.type) {
        await rulesClient.delete({ id: ruleAsset.rule_id });

        return createRules({
          rulesClient,
          immutable: true,
          id: existingRule.id,
          params: {
            ...rule,
            // Force the prepackaged rule to use the enabled state from the existing rule,
            // regardless of what the prepackaged rule says
            enabled: existingRule.enabled,
            exceptions_list: existingRule.params.exceptionsList,
            actions: existingRule.actions.map(transformAlertToRuleAction),
            timeline_id: existingRule.params.timelineId,
            timeline_title: existingRule.params.timelineTitle,
          },
        });
      }

      await patchRules({
        rulesClient,
        existingRule,
        nextParams: {
          ...rule,
          // Force enabled to use the enabled state from the existing rule by passing in undefined to patchRules
          enabled: undefined,
        },
      });

      const updatedRule = await readRules({
        rulesClient,
        ruleId: rule.rule_id,
        id: undefined,
      });

      if (!updatedRule) {
        throw new PrepackagedRulesError(`Rule ${ruleAsset.rule_id} not found after upgrade`, 500);
      }

      return updatedRule;
    },
  };
};

// TODO: Just testing normalization, to remove
const normalizeRule = (rule: RuleAlertType): RuleAlertType => {
  const immutable = rule.params.immutable;

  if (rule.params.ruleSource) {
    return {
      ...rule,
      params: {
        ...rule.params,
        immutable: rule.params.ruleSource.type === 'external',
      },
    };
  }
  const ruleSource: RuleSourceCamelCased = immutable
    ? { type: 'external', isCustomized: false }
    : { type: 'internal' };

  return {
    ...rule,
    params: {
      ...rule.params,
      ruleSource,
    },
  };
};
