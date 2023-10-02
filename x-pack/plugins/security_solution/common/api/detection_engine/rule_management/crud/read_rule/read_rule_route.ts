/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as t from 'io-ts';
import { RuleResponse } from '../../../model';
import { QueryRuleByIds } from '../../model/query_rule_by_ids';

export const ReadRuleRequestQuery = QueryRuleByIds;
export type ReadRuleRequestQuery = t.TypeOf<typeof ReadRuleRequestQuery>;

export const ReadRuleResponse = RuleResponse;
export type ReadRuleResponse = t.TypeOf<typeof ReadRuleResponse>;
