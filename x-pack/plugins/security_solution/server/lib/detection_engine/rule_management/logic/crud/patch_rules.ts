/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PartialRule, RulesClient } from '@kbn/alerting-plugin/server';
import type {
  RelatedIntegrationArray,
  RequiredFieldArray,
  SetupGuide,
  Prebuilt,
} from '../../../../../../common/api/detection_engine';

import type { PatchRuleRequestBody } from '../../../../../../common/api/detection_engine/rule_management';
import type { RuleAlertType, RuleParams } from '../../../rule_schema';
import { convertPatchAPIToInternalSchema } from '../../normalization/rule_converters';

export interface PatchRulesOptions {
  rulesClient: RulesClient;
  nextParams: PatchRuleRequestBody & {
    related_integrations?: RelatedIntegrationArray;
    required_fields?: RequiredFieldArray;
    setup?: SetupGuide;
    prebuilt?: Prebuilt;
  };
  existingRule: RuleAlertType | null | undefined;
  allowMissingConnectorSecrets?: boolean;
  shouldIncrementRevision?: boolean;
  isRuleCustomizedDuringUpdate?: boolean; // pass in new optional boolean
}

/**
 * Used when:
 *  - Updating a prebuilt rule with no type change
 *  - Importing rules and overwriting an existing rule
 *  - Patching rules (DETECTION_ENGINE_RULES_URL patch endpoint --> managing shared exceptions lists)
 *  - Bulk Patching rules (deprecated DETECTION_ENGINE_RULES_BULK_UPDATE endpoint)
 *  - Creating rule exceptions (CREATE_RULE_EXCEPTIONS_URL endpoint)
 **/
export const patchRules = async ({
  rulesClient,
  existingRule,
  nextParams,
  allowMissingConnectorSecrets,
  shouldIncrementRevision = true,
  isRuleCustomizedDuringUpdate = false,
}: PatchRulesOptions): Promise<PartialRule<RuleParams> | null> => {
  if (existingRule == null) {
    return null;
  }

  const patchedRule = convertPatchAPIToInternalSchema(
    nextParams,
    existingRule,
    isRuleCustomizedDuringUpdate
  );

  const update = await rulesClient.update({
    id: existingRule.id,
    data: patchedRule,
    allowMissingConnectorSecrets,
    shouldIncrementRevision: () => shouldIncrementRevision,
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
};
