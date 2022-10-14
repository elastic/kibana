/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { version } from '@kbn/securitysolution-io-ts-types';

import {
  RelatedIntegrationArray,
  RequiredFieldArray,
  SetupGuide,
  RuleSignatureId,
} from '../../rule_schema';

import { baseCreateParams, createTypeSpecific } from './rule_schemas';

/**
 * Big differences between this schema and the createRulesSchema
 *  - rule_id is required here
 *  - version is a required field that must exist
 */
export const addPrepackagedRulesSchema = t.intersection([
  baseCreateParams,
  createTypeSpecific,
  // version is required in addPrepackagedRulesSchema, so this supercedes the defaultable
  // version in baseParams
  t.exact(
    t.type({
      rule_id: RuleSignatureId,
      version,
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
export type AddPrepackagedRulesSchema = t.TypeOf<typeof addPrepackagedRulesSchema>;
