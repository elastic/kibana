/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PositiveInteger } from '@kbn/securitysolution-io-ts-types';
import * as t from 'io-ts';

import { success, success_count } from '../common/schemas';
import { errorSchema } from './error_schema';

export const importRulesSchema = t.exact(
  t.type({
    exceptions_success: t.boolean,
    exceptions_success_count: PositiveInteger,
    exceptions_errors: t.array(errorSchema),
    success,
    success_count,
    errors: t.array(errorSchema),
  })
);

export type ImportRulesSchema = t.TypeOf<typeof importRulesSchema>;
