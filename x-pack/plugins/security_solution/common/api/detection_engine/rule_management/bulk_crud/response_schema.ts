/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { RuleResponse, errorSchema } from '../../model';

export type BulkCrudRulesResponse = t.TypeOf<typeof BulkCrudRulesResponse>;
export const BulkCrudRulesResponse = t.array(t.union([RuleResponse, errorSchema]));
