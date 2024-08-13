/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as z from '@kbn/zod';
import type { IsEqual } from 'type-fest';
import {
  RuleSignatureId,
  RuleVersion,
  BaseCreateProps,
  TypeSpecificCreateProps,
  EqlRuleCreateFields,
  EsqlRuleCreateFields,
  MachineLearningRuleCreateFields,
  NewTermsRuleCreateFields,
  QueryRuleCreateFields,
  SavedQueryRuleCreateFields,
  ThreatMatchRuleCreateFields,
  ThresholdRuleCreateFields,
} from '../../../../../../common/api/detection_engine/model/rule_schema';

export type PickVersionValues = z.infer<typeof PickVersionValues>;
export const PickVersionValues = z.enum(['BASE', 'CURRENT', 'TARGET', 'MERGED']);
export type PickVersionValuesEnum = typeof PickVersionValues.enum;
export const PickVersionValuesEnum = PickVersionValues.enum;

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

/**
 * Creates a Map of the fields that are upgradable during the Upgrade workflow, by type.
 * Creating this Map dynamically, based on BaseCreateProps and TypeSpecificFields, ensures that we don't need to:
 *  - manually add rule types to this Map if they are created
 *  - manually add or remove any fields if they are added or removed to a specific rule type
 *  - manually add or remove any fields if we decide that they should not be part of the upgradable fields.
 */
function createUpgradableRuleFieldsByTypeMap() {
  const baseFields = [...Object.keys(PrebuiltAssetBaseProps.shape), 'version', 'rule_id'];

  return new Map(
    TypeSpecificFields.options.map((option) => {
      const typeName = option.shape.type.value;
      return [typeName, [...baseFields, ...Object.keys(option.shape)]];
    })
  );
}

export const UPGRADABLE_RULES_FIELDS_BY_TYPE_MAP = createUpgradableRuleFieldsByTypeMap();

///-------------- Alternative 1 --- "flatten" all props

function getAllFields<T extends z.ZodTypeAny>(schema: T): T {
  if (schema instanceof z.ZodIntersection) {
    return {
      ...getAllFields(schema._def.left),
      ...getAllFields(schema._def.right),
    } as T;
  } else if (schema instanceof z.ZodObject) {
    return schema.shape as T;
  } else if (schema instanceof z.ZodDiscriminatedUnion) {
    return schema.options.reduce((acc: Partial<T>, option: z.ZodObject<any>) => {
      const { type, ...rest } = option.shape;
      return { ...acc, ...rest };
    }, {}) as T;
  }
  return {} as T;
}

export const PrebuiltRuleAllFields = getAllFields(PrebuiltRuleAsset);
PrebuiltRuleAllFields._output;

//// ---------------  Alternative 2 -- 
// uses .merge() instead of .and() since it returns a more useful ZodObject
// instead of a ZodIntersection

const allTypeSpecificFields = TypeSpecificFields.options.reduce<z.ZodRawShape>((acc, option) => {
  return { ...acc, ...option.shape };
}, {});

export const PrebuiltRuleAsset2 = PrebuiltAssetBaseProps.merge(
  z.object(allTypeSpecificFields)
).merge(
  z.object({
    rule_id: RuleSignatureId,
    version: RuleVersion,
  })
);

export const test = PrebuiltRuleAsset2.keyof();
export const test2 = PrebuiltRuleAsset2.shape;



// ----------   Alternative 3 --- @xcrzx this works in runtime but TS doesn't understand the types

export const PrebuiltRuleAssetFieldsDictionary = z
  .object({
    ...PrebuiltAssetBaseProps.shape,
    ...TypeSpecificFields.options.reduce((acc, option) => ({ ...acc, ...option.shape }), {}),
    rule_id: RuleSignatureId,
    version: RuleVersion,
  });
