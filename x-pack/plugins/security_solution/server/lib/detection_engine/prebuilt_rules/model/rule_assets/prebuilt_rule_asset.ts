/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as z from 'zod';
import type {
  EqlRuleCreateFields,
  QueryRuleCreateFields,
  SavedQueryRuleCreateFields,
  ThresholdRuleCreateFields,
  ThreatMatchRuleCreateFields,
  MachineLearningRuleCreateFields,
  NewTermsRuleCreateFields,
  EsqlRuleCreateFields,
} from '../../../../../../common/api/detection_engine/model/rule_schema';
import {
  RuleSignatureId,
  RuleVersion,
  BaseCreateProps,
  TypeSpecificCreateProps,
} from '../../../../../../common/api/detection_engine/model/rule_schema';

type BaseFields = keyof BaseCreateProps;
type SpecificFields =
  | keyof Omit<EqlRuleCreateFields, 'type'>
  | keyof Omit<QueryRuleCreateFields, 'type'>
  | keyof Omit<SavedQueryRuleCreateFields, 'type'>
  | keyof Omit<ThresholdRuleCreateFields, 'type'>
  | keyof Omit<ThreatMatchRuleCreateFields, 'type'>
  | keyof Omit<MachineLearningRuleCreateFields, 'type'>
  | keyof Omit<NewTermsRuleCreateFields, 'type'>
  | keyof Omit<EsqlRuleCreateFields, 'type'>;

type AllRuleProperties = BaseFields | SpecificFields;

/**
 * The PrebuiltRuleAsset is created out of the Rule schema types defined in our OpenAPI schemas.
 * However, we don't need all the fields in the rule schemas to be present in the PrebuiltRuleAsset.
 * We manually exclude those unwanted fields here.
 *
 * Reference ticket:
 * https://github.com/elastic/kibana/issues/180393
 *
 */
type OmittedProperties = Extract<
  AllRuleProperties,
  | 'actions'
  | 'throttle'
  | 'meta'
  | 'output_index'
  | 'namespace'
  | 'alias_purpose'
  | 'alias_target_id'
  | 'outcome'
>;

const PROPERTIES_TO_OMIT: Record<OmittedProperties, true> = {
  actions: true,
  throttle: true,
  meta: true,
  output_index: true,
  namespace: true,
  alias_purpose: true,
  alias_target_id: true,
  outcome: true,
};

const RuleAssetBaseCreateProps = BaseCreateProps.omit(PROPERTIES_TO_OMIT);

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
 *  - rule_id is required here
 *  - version is a required field that must exist
 */
export type PrebuiltRuleAsset = z.infer<typeof PrebuiltRuleAsset>;
export const PrebuiltRuleAsset = RuleAssetBaseCreateProps.and(TypeSpecificCreateProps).and(
  z.object({
    rule_id: RuleSignatureId,
    version: RuleVersion,
  })
);
