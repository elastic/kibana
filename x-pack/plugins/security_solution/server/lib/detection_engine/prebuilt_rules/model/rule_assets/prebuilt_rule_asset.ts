/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as z from 'zod';
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

// `response_actions` is only part of the optional fields in QueryRuleCreateFields and SavedQueryRuleCreateFields
const TYPE_SPECIFIC_PROPS_REMOVED_FROM_PREBUILT_RULE_ASSET = zodMaskFor<
  QueryRuleCreateFields | SavedQueryRuleCreateFields
>()(['response_actions']);

const QueryRuleAssetFields = QueryRuleCreateFields.omit(
  TYPE_SPECIFIC_PROPS_REMOVED_FROM_PREBUILT_RULE_ASSET
);
const SavedQueryRuleAssetFields = SavedQueryRuleCreateFields.omit(
  TYPE_SPECIFIC_PROPS_REMOVED_FROM_PREBUILT_RULE_ASSET
);

export const RuleAssetTypeSpecificCreateProps = z.discriminatedUnion('type', [
  EqlRuleCreateFields,
  QueryRuleAssetFields,
  SavedQueryRuleAssetFields,
  ThresholdRuleCreateFields,
  ThreatMatchRuleCreateFields,
  MachineLearningRuleCreateFields,
  NewTermsRuleCreateFields,
  EsqlRuleCreateFields,
]);

function zodMaskFor<T>() {
  return function <U extends keyof T>(props: U[]): Record<U, true> {
    type PropObject = Record<string, boolean>;
    const propObjects: PropObject[] = props.map((p: U) => ({ [p]: true }));
    return Object.assign({}, ...propObjects);
  };
}

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
export const PrebuiltRuleAsset = BaseCreateProps.omit(BASE_PROPS_REMOVED_FROM_PREBUILT_RULE_ASSET)
  .and(RuleAssetTypeSpecificCreateProps)
  .and(
    z.object({
      rule_id: RuleSignatureId,
      version: RuleVersion,
    })
  );
