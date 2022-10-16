/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import {
  patchTypeSpecific,
  sharedPatchSchema,
  thresholdPatchParams,
} from '../../../../../rule_schema';

/**
 * Request body parameters of the API route.
 * All of the patch elements should default to undefined if not set.
 */
export type PatchRuleRequestBody = t.TypeOf<typeof PatchRuleRequestBody>;
export const PatchRuleRequestBody = t.intersection([patchTypeSpecific, sharedPatchSchema]);

export type ThresholdPatchRuleRequestBody = t.TypeOf<typeof ThresholdPatchRuleRequestBody>;
export const ThresholdPatchRuleRequestBody = t.intersection([
  thresholdPatchParams,
  sharedPatchSchema,
]);
