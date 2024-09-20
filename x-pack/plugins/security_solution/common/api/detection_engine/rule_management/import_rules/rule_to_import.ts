/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as z from '@kbn/zod';
import {
  BaseCreateProps,
  ResponseFields,
  RequiredFieldInput,
  RuleSignatureId,
  TypeSpecificCreateProps,
  RuleVersion,
} from '../../model/rule_schema';

/**
 * Differences from this and the createRulesSchema are
 *   - rule_id is required
 *   - version is required
 *   - id is optional (but ignored in the import code - rule_id is exclusively used for imports)
 *   - immutable is optional (but ignored in the import code)
 *   - created_at is optional (but ignored in the import code)
 *   - updated_at is optional (but ignored in the import code)
 *   - created_by is optional (but ignored in the import code)
 *   - updated_by is optional (but ignored in the import code)
 */
export type RuleToImport = z.infer<typeof RuleToImport>;
export type RuleToImportInput = z.input<typeof RuleToImport>;
export const RuleToImport = BaseCreateProps.and(TypeSpecificCreateProps).and(
  ResponseFields.partial().extend({
    rule_id: RuleSignatureId,
    /*
      Overriding `required_fields` from ResponseFields because
      in ResponseFields `required_fields` has the output type,
      but for importing rules, we need to use the input type.
      Otherwise importing rules without the "ecs" property in
      `required_fields` will fail.
    */
    required_fields: z.array(RequiredFieldInput).optional(),
  })
);

/**
 * This type represents new rules being imported once the prebuilt rule
 * customization work is complete. In order to provide backwards compatibility
 * with existing rules, and not change behavior, we now validate `version` in
 * the route as opposed to the type itself.
 *
 * It differs from RuleToImport in that it requires a `version` field.
 */
export type ValidatedRuleToImport = z.infer<typeof ValidatedRuleToImport>;
export type ValidatedRuleToImportInput = z.input<typeof ValidatedRuleToImport>;
export const ValidatedRuleToImport = RuleToImport.and(
  z.object({
    version: RuleVersion,
  })
);
