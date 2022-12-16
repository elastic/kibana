/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import {
  BaseCreateProps,
  RelatedIntegrationArray,
  RequiredFieldArray,
  RuleSignatureId,
  SetupGuide,
  TypeSpecificCreateProps,
} from '../../../rule_schema';

import { SemanticVersion } from './semantic_version';

/**
 * Full content of a prebuilt rule.
 * Is defined for each prebuilt rule in https://github.com/elastic/detection-rules.
 * Is shipped via the `security_detection_engine` Fleet package.
 * Is installed as separate saved objects when the package is installed.
 *
 * NOTE: This is NOT a schema of the saved objects. It's a model of a single version of the content.
 */
export type PrebuiltRuleContent = t.TypeOf<typeof PrebuiltRuleContent>;
export const PrebuiltRuleContent = t.intersection([
  BaseCreateProps,
  TypeSpecificCreateProps,
  t.exact(
    t.type({
      rule_id: RuleSignatureId,
      rule_content_version: SemanticVersion,
      stack_version_min: SemanticVersion,
      stack_version_max: SemanticVersion,
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
