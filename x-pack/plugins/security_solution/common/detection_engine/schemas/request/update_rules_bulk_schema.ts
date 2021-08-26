/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { updateRulesSchema } from './rule_schemas';

export const updateRulesBulkSchema = t.array(updateRulesSchema);
export type UpdateRulesBulkSchema = t.TypeOf<typeof updateRulesBulkSchema>;
