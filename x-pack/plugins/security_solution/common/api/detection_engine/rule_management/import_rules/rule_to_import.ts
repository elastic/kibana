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
    immutable: z.boolean().optional().default(false),
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
 * PrebuiltRuleToImport represents a RuleToImport that has been validated as
 * representing a prebuilt rule. Part of this definition is the inclusion of a
 * "version" specifier, which is represented here.
 */
export type PrebuiltRuleToImport = z.infer<typeof PrebuiltRuleToImport>;
export type PrebuiltRuleToImportInput = z.input<typeof PrebuiltRuleToImport>;
export const PrebuiltRuleToImport = RuleToImport.and(z.object({ version: RuleVersion }));
