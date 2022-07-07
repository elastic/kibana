/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { OnlyFalseAllowed } from '@kbn/securitysolution-io-ts-types';
import {
  rule_id,
  id,
  created_at,
  updated_at,
  created_by,
  updated_by,
  RelatedIntegrationArray,
  RequiredFieldArray,
  SetupGuide,
} from '../common';
import { baseCreateParams, createTypeSpecific } from './rule_schemas';

/**
 * Differences from this and the createRulesSchema are
 *   - rule_id is required
 *   - id is optional (but ignored in the import code - rule_id is exclusively used for imports)
 *   - immutable is optional but if it is any value other than false it will be rejected
 *   - created_at is optional (but ignored in the import code)
 *   - updated_at is optional (but ignored in the import code)
 *   - created_by is optional (but ignored in the import code)
 *   - updated_by is optional (but ignored in the import code)
 */
export const importRulesSchema = t.intersection([
  baseCreateParams,
  createTypeSpecific,
  t.exact(t.type({ rule_id })),
  t.exact(
    t.partial({
      id,
      immutable: OnlyFalseAllowed,
      updated_at,
      updated_by,
      created_at,
      created_by,
      related_integrations: RelatedIntegrationArray,
      required_fields: RequiredFieldArray,
      setup: SetupGuide,
    })
  ),
]);

export type ImportRulesSchema = t.TypeOf<typeof importRulesSchema>;

export const importRulesPayloadSchema = t.exact(
  t.type({
    file: t.object,
  })
);

export type ImportRulesPayloadSchema = t.TypeOf<typeof importRulesPayloadSchema>;
