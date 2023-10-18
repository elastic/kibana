/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as t from 'io-ts';
import { RulePatchProps, RuleResponse } from '../../../model';

/**
 * Request body parameters of the API route.
 * All of the patch elements should default to undefined if not set.
 */
export type PatchRuleRequestBody = RulePatchProps;
export const PatchRuleRequestBody = RulePatchProps;

export const PatchRuleResponse = RuleResponse;
export type PatchRuleResponse = t.TypeOf<typeof PatchRuleResponse>;
