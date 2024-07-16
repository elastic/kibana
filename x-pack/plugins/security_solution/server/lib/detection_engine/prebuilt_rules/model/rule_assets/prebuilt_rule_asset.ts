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
  TypeSpecificCreateProps,
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

/**
 * Aditionally remove fields which are part only of the optional fields in the rule types that make up
 * the TypeSpecificCreateProps discriminatedUnion, by using a Zod transformation which extracts out the
 * necessary fields in the rules types where they exist. Fields to extract:
 *  - response_actions: from Query and SavedQuery rules
 */
const TypeSpecificFields = TypeSpecificCreateProps.transform((val) => {
  switch (val.type) {
    case 'query': {
      const { response_actions: _, ...rest } = val;
      return rest;
    }
    case 'saved_query': {
      const { response_actions: _, ...rest } = val;
      return rest;
    }
    default:
      return val;
  }
});

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
  .and(TypeSpecificFields)
  .and(
    z.object({
      rule_id: RuleSignatureId,
      version: RuleVersion,
    })
  );
