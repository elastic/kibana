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
  eqlPatchParams,
  threatMatchPatchParams,
  queryPatchParams,
  savedQueryPatchParams,
  thresholdPatchParams,
  machineLearningPatchParams,
  newTermsPatchParams,
} from './rule_schemas';

/**
 * All of the patch elements should default to undefined if not set
 */
export const patchRulesSchema = t.intersection([patchTypeSpecific, sharedPatchSchema]);
export type PatchRulesSchema = t.TypeOf<typeof patchRulesSchema>;

const eqlPatchSchema = t.intersection([eqlPatchParams, sharedPatchSchema]);
export type EqlPatchSchema = t.TypeOf<typeof eqlPatchSchema>;

const threatMatchPatchSchema = t.intersection([threatMatchPatchParams, sharedPatchSchema]);
export type ThreatMatchPatchSchema = t.TypeOf<typeof threatMatchPatchSchema>;

const queryPatchSchema = t.intersection([queryPatchParams, sharedPatchSchema]);
export type QueryPatchSchema = t.TypeOf<typeof queryPatchSchema>;

const savedQueryPatchSchema = t.intersection([savedQueryPatchParams, sharedPatchSchema]);
export type SavedQueryPatchSchema = t.TypeOf<typeof savedQueryPatchSchema>;

const thresholdPatchSchema = t.intersection([thresholdPatchParams, sharedPatchSchema]);
export type ThresholdPatchSchema = t.TypeOf<typeof thresholdPatchSchema>;

const machineLearningPatchSchema = t.intersection([machineLearningPatchParams, sharedPatchSchema]);
export type MachineLearningPatchSchema = t.TypeOf<typeof machineLearningPatchSchema>;

const newTermsFullPatchSchema = t.intersection([newTermsPatchParams, sharedPatchSchema]);
export type NewTermsFullPatchSchema = t.TypeOf<typeof newTermsFullPatchSchema>;
