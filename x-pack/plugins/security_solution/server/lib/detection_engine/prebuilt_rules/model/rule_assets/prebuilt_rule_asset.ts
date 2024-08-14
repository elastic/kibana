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
  'throttle',
  'meta',
  'output_index',
  'namespace',
  'alias_purpose',
  'alias_target_id',
  'outcome',
]);

/**
 * Aditionally remove fields which are part only of the optional fields in the rule types that make up
 * the TypeSpecificCreateProps discriminatedUnion, by recreating a discriminated union of the types, but
 * with the necessary fields omitted, in the types where they exist. Fields to extract:
 *  - response_actions: from Query and SavedQuery rules
 */
const TYPE_SPECIFIC_FIELDS_TO_OMIT = ['response_actions'] as const;

const TYPE_SPECIFIC_FIELDS_TO_OMIT_FROM_QUERY_RULES = zodMaskFor<QueryRuleCreateFields>()([
  ...TYPE_SPECIFIC_FIELDS_TO_OMIT,
]);
const TYPE_SPECIFIC_FIELDS_TO_OMIT_FROM_SAVED_QUERY_RULES =
  zodMaskFor<SavedQueryRuleCreateFields>()([...TYPE_SPECIFIC_FIELDS_TO_OMIT]);

export type TypeSpecificFields = z.infer<typeof TypeSpecificFields>;
export const TypeSpecificFields = z.discriminatedUnion('type', [
  EqlRuleCreateFields,
  QueryRuleCreateFields.omit(TYPE_SPECIFIC_FIELDS_TO_OMIT_FROM_QUERY_RULES),
  SavedQueryRuleCreateFields.omit(TYPE_SPECIFIC_FIELDS_TO_OMIT_FROM_SAVED_QUERY_RULES),
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

/**
 * Fields which are not part of the RuleUpgradeSpecifierFields schema, and are handled
 * manually during the upgrade workflow.
 */
const NON_UPGRADABLE_FIELDS: string[] = [
  'alert_suppression',
  'author',
  'license',
  'concurrent_searches',
  'items_per_search',
  'version',
  'type',
  'to',
];

function createRuleUpgradeSpecifierFields() {
  const allUpgradableFields = new Set(
    Array.from(UPGRADABLE_FIELDS_PAYLOAD_BY_RULE_TYPE.values()).flat()
  );
  NON_UPGRADABLE_FIELDS.forEach((field) => allUpgradableFields.delete(field));

  return allUpgradableFields;
}

/**
 * List of fields that are part of the RuleUpgradeSpecifierFields schema, which is part of the
 * /upgrade/_perform endpoint request payload. This list is used to test that all upgradable fields from
 * the PrebuiltRuleAsset are part of the RuleUpgradeSpecifierFields schema.
 *
 * Note that some of the fields of the PrebuiltRuleAsset schema are not upgradable in the update workflow
 * of the /upgrade/_perform endpoint (and therefore nor part of RuleUpgradeSpecifierFields) so they are
 * manually excluded from the list of upgradable fields.
 *
 */
export const RULE_UPGRADE_SPECIFIER_FIELDS = createRuleUpgradeSpecifierFields();
