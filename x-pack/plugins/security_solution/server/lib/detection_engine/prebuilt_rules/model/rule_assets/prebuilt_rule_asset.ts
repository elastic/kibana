/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import {
  RelatedIntegrationArray,
  RequiredFieldArray,
  SetupGuide,
  RuleSignatureId,
  RuleVersion,
  BaseCreateProps,
  TypeSpecificCreateProps,
} from '../../../../../../common/api/detection_engine/model/rule_schema';

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
export type PrebuiltRuleAsset = t.TypeOf<typeof PrebuiltRuleAsset>;
export const PrebuiltRuleAsset = t.intersection([
  BaseCreateProps,
  TypeSpecificCreateProps,
  // version is required here, which supercedes the defaultable version in baseSchema
  t.exact(
    t.type({
      rule_id: RuleSignatureId,
      version: RuleVersion,
    })
  ),
  t.exact(
    t.partial({
      related_integrations: RelatedIntegrationArray,
      required_fields: RequiredFieldArray,
      setup: SetupGuide,
    })
  ),
]);
