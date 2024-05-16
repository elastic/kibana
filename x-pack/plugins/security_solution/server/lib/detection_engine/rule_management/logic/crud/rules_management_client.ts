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
 *  10. UPGRADE PREBUILT RULE WITH TYPE CHANGE ✅
 *  11. UPGRADE PREBUILT RULE OF SAME TYPE ✅
 *  12. IMPORT NON EXISTING RULE ✅
 *  13. IMPORT EXISTING RULE - with override option
 *  14. CREATE RULE EXCEPTIONS
 *
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import { transformAlertToRuleAction } from '../../../../../../common/detection_engine/transform_actions';
import type {
  PatchRuleRequestBody,
  RuleCreateProps,
  RuleObjectId,
  RuleToImport,
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

interface CreateRuleOptions {
  /* Optionally pass an ID to use for the rule document. If not provided, an ID will be generated. */
  /* This is the ES document ID, NOT the rule_id */
  id?: string;
  immutable?: boolean;
  defaultEnabled?: boolean;
  allowMissingConnectorSecrets?: boolean;
}
interface CreateCustomRuleProps {
  params: RuleCreateProps;
}
interface CreatePrebuiltRuleProps {
  ruleAsset: PrebuiltRuleAsset;
}

interface _UpdateRuleProps {
  existingRule: RuleAlertType;
  ruleUpdate: RuleUpdateProps;
}

type UpdateRuleProps = _UpdateRuleProps;

interface _PatchRuleProps {
  existingRule: RuleAlertType;
  nextParams: PatchRuleRequestBody;
}

type PatchRuleProps = _PatchRuleProps;

interface DeleteRuleProps {
  ruleId: RuleObjectId;
}

interface UpgradePrebuiltRuleProps {
  ruleAsset: PrebuiltRuleAsset;
}

interface ImportRuleOptions {
  allowMissingConnectorSecrets?: boolean;
}

interface ImportNewRuleProps {
  ruleToImport: RuleToImport;
  options?: ImportRuleOptions;
}

interface ImportExistingRuleProps {
  ruleToImport: RuleToImport;
  existingRule: RuleAlertType;
}

// TODOs:
// 1. Refactor `convertCreateAPIToInternalSchema` to take a first argument of input/params and then options object
// 2. Check if the options (enabled!) passed to rule creation didn't change in the refactor. Cases
//    a. When creating a custom rule
//    b. When creating a prebuilt rule
//    c. When upgrading a prebuilt rule with type change
// 3. Check that when patching the enabled state is maintained

export class RulesManagementClient {
  private readonly rulesClient: RulesClient;

  constructor(rulesClient: RulesClient) {
    this.rulesClient = rulesClient;
  }

  // 1.  CREATE CUSTOM RULE
  public createCustomRule = async (
    createCustomRulePayload: CreateCustomRuleProps
  ): Promise<RuleAlertType> => {
    const { params } = createCustomRulePayload;

    const rule = await this._createRule(params, { immutable: false });
    return rule;
  };

  // 9. INSTALL NEW PREBUILT RULES
  public createPrebuiltRule = async (
    createPrebuiltRulePayload: CreatePrebuiltRuleProps
  ): Promise<RuleAlertType> => {
    const { ruleAsset } = createPrebuiltRulePayload;

    const rule = await this._createRule(ruleAsset, { immutable: true, defaultEnabled: false });

    return rule;
  };

  // 3.  UPDATE RULE
  public updateRule = async (updateRulePayload: UpdateRuleProps): Promise<RuleAlertType> => {
    const { ruleUpdate, existingRule } = updateRulePayload;

    const update = await this._updateRule({ ruleUpdate, existingRule });

    const enabled = ruleUpdate.enabled ?? existingRule.enabled;
    await this._toggleRuleEnabledOnUpdate(existingRule, enabled);

    return { ...update, enabled };
  };

  // 5.  PATCH RULE
  public patchRule = async (patchRulePayload: PatchRuleProps): Promise<RuleAlertType> => {
    const { nextParams, existingRule } = patchRulePayload;
    const update = await this._patchRule(patchRulePayload);

    await this._toggleRuleEnabledOnUpdate(existingRule, nextParams.enabled ?? false);

    if (nextParams.enabled != null) {
      return { ...update, enabled: nextParams.enabled };
    } else {
      return update;
    }
  };

  // 7.  DELETE RULE
  public deleteRule = async (deleteRulePayload: DeleteRuleProps): Promise<void> => {
    const { ruleId } = deleteRulePayload;
    await this.rulesClient.delete({ id: ruleId });
  };

  // 10. AND 11. UPGRADE PREBUILT RULE
  public upgradePrebuiltRule = async (
    upgradePrebuiltRulePayload: UpgradePrebuiltRuleProps
  ): Promise<RuleAlertType> => {
    const { ruleAsset } = upgradePrebuiltRulePayload;
    const existingRule = await readRules({
      rulesClient: this.rulesClient,
      ruleId: ruleAsset.rule_id,
      id: undefined,
    });

    if (!existingRule) {
      throw new PrepackagedRulesError(`Failed to find rule ${ruleAsset.rule_id}`, 500);
    }

    // If rule has change its type during upgrade, delete and recreate it
    if (ruleAsset.type !== existingRule.params.type) {
      return this._upgradePrebuiltRuleWithTypeChange(ruleAsset, existingRule);
    }

    // Else, simply patch it.
    await this._patchRule({ existingRule, nextParams: ruleAsset });

    const updatedRule = await readRules({
      rulesClient: this.rulesClient,
      ruleId: ruleAsset.rule_id,
      id: undefined,
    });

    if (!updatedRule) {
      throw new PrepackagedRulesError(`Rule ${ruleAsset.rule_id} not found after upgrade`, 500);
    }

    return updatedRule;
  };

  // 12. IMPORT RULE
  public _importNewRule = async (importRulePayload: ImportNewRuleProps): Promise<RuleAlertType> => {
    const { ruleToImport, options } = importRulePayload;

    return this._createRule(ruleToImport, {
      immutable: false,
      allowMissingConnectorSecrets: options?.allowMissingConnectorSecrets,
    });
  };

  public _importExistingRule = async (
    importRulePayload: ImportExistingRuleProps
  ): Promise<RuleAlertType> => {
    const { ruleToImport, existingRule } = importRulePayload;

    return this._updateRule({
      existingRule,
      ruleUpdate: ruleToImport,
    });
  };

  private _createRule = async (params: RuleCreateProps, options: CreateRuleOptions) => {
    const rulesClientCreateRuleOptions = options.id ? { id: options.id } : {};

    const internalRule = convertCreateAPIToInternalSchema(params, options);
    const rule = await this.rulesClient.create<RuleParams>({
      data: internalRule,
      options: rulesClientCreateRuleOptions,
      allowMissingConnectorSecrets: options.allowMissingConnectorSecrets,
    });

    return rule;
  };

  private _updateRule = async (updateRulePayload: _UpdateRuleProps): Promise<RuleAlertType> => {
    const { ruleUpdate, existingRule } = updateRulePayload;

    const newInternalRule = convertUpdateAPIToInternalSchema({
      existingRule,
      ruleUpdate,
    });

    const update = await this.rulesClient.update({
      id: existingRule.id,
      data: newInternalRule,
    });

    return update;
  };

  private _patchRule = async (patchRulePayload: _PatchRuleProps): Promise<RuleAlertType> => {
    const { nextParams, existingRule } = patchRulePayload;

    const patchedRule = convertPatchAPIToInternalSchema(nextParams, existingRule);

    const update = await this.rulesClient.update({
      id: existingRule.id,
      data: patchedRule,
    });

    return update;
  };

  private _upgradePrebuiltRuleWithTypeChange = async (
    ruleAsset: PrebuiltRuleAsset,
    existingRule: RuleAlertType
  ) => {
    // If we're trying to change the type of a prepackaged rule, we need to delete the old one
    // and replace it with the new rule, keeping the enabled setting, actions, throttle, id,
    // and exception lists from the old rule
    await this.rulesClient.delete({ id: ruleAsset.rule_id });

    return this._createRule(
      {
        ...ruleAsset,
        enabled: existingRule.enabled,
        exceptions_list: existingRule.params.exceptionsList,
        actions: existingRule.actions.map(transformAlertToRuleAction),
        timeline_id: existingRule.params.timelineId,
        timeline_title: existingRule.params.timelineTitle,
      },
      { immutable: true, defaultEnabled: existingRule.enabled, id: existingRule.id }
    );
  };

  private _toggleRuleEnabledOnUpdate = async (existingRule: RuleAlertType, enabled: boolean) => {
    if (existingRule.enabled && enabled === false) {
      await this.rulesClient.disable({ id: existingRule.id });
    } else if (!existingRule.enabled && enabled === true) {
      await this.rulesClient.enable({ id: existingRule.id });
    }
  };
}

//
//
//
//
//
//
//
//
//
//
//
//
//
//
//

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
