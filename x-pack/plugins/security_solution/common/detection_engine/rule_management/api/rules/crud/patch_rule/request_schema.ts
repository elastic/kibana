/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RulePatchProps, ThresholdRulePatchProps } from '../../../../../rule_schema';

/**
 * Request body parameters of the API route.
 * All of the patch elements should default to undefined if not set.
 */
export type PatchRuleRequestBody = RulePatchProps;
export const PatchRuleRequestBody = RulePatchProps;

export type ThresholdPatchRuleRequestBody = ThresholdRulePatchProps;
export const ThresholdPatchRuleRequestBody = ThresholdRulePatchProps;
