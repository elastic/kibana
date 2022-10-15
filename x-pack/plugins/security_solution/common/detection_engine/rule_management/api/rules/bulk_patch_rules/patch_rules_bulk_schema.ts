/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { patchRulesSchema } from '../patch_rule/patch_rules_schema';

export const patchRulesBulkSchema = t.array(patchRulesSchema);
export type PatchRulesBulkSchema = t.TypeOf<typeof patchRulesBulkSchema>;
