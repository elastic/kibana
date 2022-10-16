/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { fullResponseSchema } from '../../../../schemas/request';
import { errorSchema } from '../../../../schemas/response/error_schema';

export type BulkCrudRulesResponse = t.TypeOf<typeof BulkCrudRulesResponse>;
export const BulkCrudRulesResponse = t.array(t.union([fullResponseSchema, errorSchema]));
