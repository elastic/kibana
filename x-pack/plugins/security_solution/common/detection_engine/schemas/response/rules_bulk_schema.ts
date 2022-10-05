/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { fullResponseSchema } from '../request';
import { errorSchema } from './error_schema';

export const rulesBulkSchema = t.array(t.union([fullResponseSchema, errorSchema]));
export type RulesBulkSchema = t.TypeOf<typeof rulesBulkSchema>;
