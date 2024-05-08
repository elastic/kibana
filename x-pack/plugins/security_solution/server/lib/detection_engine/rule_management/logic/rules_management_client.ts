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
 *  1.  CREATE CUSTOM RULE
 *  2.  BULK CREATE CUSTOM RULES
 *  3.  UPDATE RULE
 *  4.  BULK UPDATE RULES
 *  5.  PATCH RULE
 *  6.  BULK PATCH RULES
 *  7.  DELETE RULES
 *  8.  BULK DELETE RULES
 *  9.  INSTALL NEW PREBUILT RULES
 *  10. UPGRADE RULE WITH TYPE CHANGE
 *  11. UPGRADE RULE OF SAME TYPE
 *  12. IMPORT NON EXISTING RULE
 *  13. IMPORT EXISTING RULE - with override option
 *  14. CREATE RULE EXCEPTIONS
 *
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { SanitizedRule } from '@kbn/alerting-plugin/common';
import type { RuleCreateProps } from '../../../../../common/api/detection_engine';
import { convertCreateAPIToInternalSchema } from '..';
import type { RuleParams } from '../../rule_schema';

interface CreateCustomRuleProps {
  rulesClient: RulesClient;
  params: RuleCreateProps;
}

export const RulesManagementClient = () => {
  return {
    // 1.  CREATE CUSTOM RULE
    createCustomRule: async (
      createCustomRulePayload: CreateCustomRuleProps
    ): Promise<SanitizedRule<RuleParams>> => {
      const { rulesClient, params } = createCustomRulePayload;

      const internalRule = convertCreateAPIToInternalSchema(params, false);
      const rule = await rulesClient.create<RuleParams>({
        data: internalRule,
      });

      return rule;
    },

    // 2.  BULK CREATE CUSTOM RULES
    bulkCreateCustomRules: () => {
      // API handler loops over istances of createCustomRule
    },

    // 3. UPDATE RULE

  };
};
