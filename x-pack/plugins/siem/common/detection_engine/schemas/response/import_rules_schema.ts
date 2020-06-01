/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

/* eslint-disable @typescript-eslint/camelcase */
import { success, success_count } from '../common/schemas';
import { errorSchema } from './error_schema';
/* eslint-enable @typescript-eslint/camelcase */

export const importRulesSchema = t.exact(
  t.type({
    success,
    success_count,
    errors: t.array(errorSchema),
  })
);

export type ImportRulesSchema = t.TypeOf<typeof importRulesSchema>;
