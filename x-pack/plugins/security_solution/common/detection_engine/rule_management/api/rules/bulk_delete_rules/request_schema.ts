/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { QueryRuleByIds } from '../read_rule/query_rule_by_ids';

/**
 * Request body parameters of the API route.
 */
export type BulkDeleteRulesRequestBody = t.TypeOf<typeof BulkDeleteRulesRequestBody>;
export const BulkDeleteRulesRequestBody = t.array(QueryRuleByIds);
