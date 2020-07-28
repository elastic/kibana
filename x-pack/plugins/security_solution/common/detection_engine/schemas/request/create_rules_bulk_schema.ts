/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

import { createRulesSchema, CreateRulesSchemaDecoded } from './create_rules_schema';

export const createRulesBulkSchema = t.array(createRulesSchema);
export type CreateRulesBulkSchema = t.TypeOf<typeof createRulesBulkSchema>;

export type CreateRulesBulkSchemaDecoded = CreateRulesSchemaDecoded[];
