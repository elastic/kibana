/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

import { queryRulesSchema, QueryRulesSchemaDecoded } from './query_rules_schema';

export const queryRulesBulkSchema = t.array(queryRulesSchema);
export type QueryRulesBulkSchema = t.TypeOf<typeof queryRulesBulkSchema>;

export type QueryRulesBulkSchemaDecoded = QueryRulesSchemaDecoded[];
