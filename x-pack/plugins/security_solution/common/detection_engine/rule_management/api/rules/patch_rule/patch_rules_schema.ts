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
} from '../../../../schemas/request/rule_schemas';

/**
 * All of the patch elements should default to undefined if not set
 */
export const patchRulesSchema = t.intersection([patchTypeSpecific, sharedPatchSchema]);
export type PatchRulesSchema = t.TypeOf<typeof patchRulesSchema>;

const thresholdPatchSchema = t.intersection([thresholdPatchParams, sharedPatchSchema]);
export type ThresholdPatchSchema = t.TypeOf<typeof thresholdPatchSchema>;
