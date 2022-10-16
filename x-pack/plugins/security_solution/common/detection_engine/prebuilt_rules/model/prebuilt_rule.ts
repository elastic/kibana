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
  baseCreateParams,
  createTypeSpecific,
} from '../../rule_schema';

/**
 * Big differences between this schema and the createRulesSchema
 *  - rule_id is required here
 *  - version is a required field that must exist
 */
export type PrebuiltRuleToInstall = t.TypeOf<typeof PrebuiltRuleToInstall>;
export const PrebuiltRuleToInstall = t.intersection([
  baseCreateParams,
  createTypeSpecific,
  // version is required in PrebuiltRuleToInstall, so this supercedes the defaultable
  // version in baseParams
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
