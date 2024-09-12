/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as z from '@kbn/zod';
import type { IsEqual } from 'type-fest';
import type { TypeSpecificCreateProps } from '../../../../../../common/api/detection_engine/model/rule_schema';
import {
  RuleSignatureId,
  RuleVersion,
  BaseCreateProps,
  EqlRuleCreateFields,
  EsqlRuleCreateFields,
  MachineLearningRuleCreateFields,
  NewTermsRuleCreateFields,
  QueryRuleCreateFields,
  SavedQueryRuleCreateFields,
  ThreatMatchRuleCreateFields,
  ThresholdRuleCreateFields,
} from '../../../../../../common/api/detection_engine/model/rule_schema';

function zodMaskFor<T>() {
  return function <U extends keyof T>(props: U[]): Record<U, true> {
    type PropObject = Record<string, boolean>;
    const propObjects: PropObject[] = props.map((p: U) => ({ [p]: true }));
    return Object.assign({}, ...propObjects);
  };
}

/**
 * The PrebuiltRuleAsset schema is created based on the rule schema defined in our OpenAPI specs.
 * However, we don't need all the rule schema fields to be present in the PrebuiltRuleAsset.
 * We omit some of them because they are not present in https://github.com/elastic/detection-rules.
 * Context: https://github.com/elastic/kibana/issues/180393
 */
const BASE_PROPS_REMOVED_FROM_PREBUILT_RULE_ASSET = zodMaskFor<BaseCreateProps>()([
  'actions',
  'response_actions',
  'throttle',
  'meta',
  'output_index',
  'namespace',
  'alias_purpose',
  'alias_target_id',
  'outcome',
]);

export const TypeSpecificFields = z.discriminatedUnion('type', [
  EqlRuleCreateFields,
  QueryRuleCreateFields,
  SavedQueryRuleCreateFields,
  ThresholdRuleCreateFields,
  ThreatMatchRuleCreateFields,
  MachineLearningRuleCreateFields,
  NewTermsRuleCreateFields,
  EsqlRuleCreateFields,
]);

// Make sure the type-specific fields contain all the same rule types as the type-specific rule params.
// TS will throw a type error if the types are not equal (for example, if a new rule type is added to
// the TypeSpecificCreateProps and the new type is not reflected in TypeSpecificFields).
export const areTypesEqual: IsEqual<
  typeof TypeSpecificCreateProps._type.type,
  typeof TypeSpecificFields._type.type
> = true;

export const PrebuiltAssetBaseProps = BaseCreateProps.omit(
  BASE_PROPS_REMOVED_FROM_PREBUILT_RULE_ASSET
);

/**
 * Asset containing source content of a prebuilt Security detection rule.
 * Is defined for each prebuilt rule in https://github.com/elastic/detection-rules.
 * Is shipped via the `security_detection_engine` Fleet package.
 * Is installed as saved objects of type "security-rule" when the package is installed.
 *
 * Additionally, "security-rule" assets can be shipped via other Fleet packages, such as:
 *   - LotL Attack Detection https://github.com/elastic/integrations/pull/2115
 *   - Data Exfiltration Detection
 *
 * Big differences between this schema and RuleCreateProps:
 *  - rule_id is a required field
 *  - version is a required field
 *  - some fields are omitted because they are not present in https://github.com/elastic/detection-rules
 */
export type PrebuiltRuleAsset = z.infer<typeof PrebuiltRuleAsset>;
export const PrebuiltRuleAsset = PrebuiltAssetBaseProps.and(TypeSpecificFields).and(
  z.object({
    rule_id: RuleSignatureId,
    version: RuleVersion,
  })
);

function createUpgradableRuleFieldsPayloadByType() {
  const baseFields = Object.keys(PrebuiltAssetBaseProps.shape);

  return new Map(
    TypeSpecificFields.options.map((option) => {
      const typeName = option.shape.type.value;
      const typeSpecificFieldsForType = Object.keys(option.shape);

      return [typeName, [...baseFields, ...typeSpecificFieldsForType]];
    })
  );
}

/**
 * Map of the fields payloads to be passed to the `upgradePrebuiltRules()` method during the
 * Upgrade workflow (`/upgrade/_perform` endpoint) by type.
 *
 * Creating this Map dynamically, based on BaseCreateProps and TypeSpecificFields, ensures that we don't need to:
 *  - manually add rule types to this Map if they are created
 *  - manually add or remove any fields if they are added or removed to a specific rule type
 *  - manually add or remove any fields if we decide that they should not be part of the upgradable fields.
 *
 * Notice that this Map includes, for each rule type, all fields that are part of the BaseCreateProps and all fields that
 * are part of the TypeSpecificFields, including those that are not part of RuleUpgradeSpecifierFields schema, where
 * the user of the /upgrade/_perform endpoint can specify which fields to upgrade during the upgrade workflow.
 */
export const UPGRADABLE_FIELDS_PAYLOAD_BY_RULE_TYPE = createUpgradableRuleFieldsPayloadByType();
