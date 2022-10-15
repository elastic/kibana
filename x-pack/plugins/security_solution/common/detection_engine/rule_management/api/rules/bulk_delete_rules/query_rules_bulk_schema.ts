/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import type { QueryRulesSchemaDecoded } from '../read_rule/query_rules_schema';
import { queryRulesSchema } from '../read_rule/query_rules_schema';

export const queryRulesBulkSchema = t.array(queryRulesSchema);
export type QueryRulesBulkSchema = t.TypeOf<typeof queryRulesBulkSchema>;

export type QueryRulesBulkSchemaDecoded = QueryRulesSchemaDecoded[];
