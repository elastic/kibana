/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

import { rulesSchema } from './rules_schema';
import { page, perPage, total } from '../common/schemas';

export const findRulesSchema = t.exact(
  t.type({
    page,
    perPage,
    total,
    data: t.array(rulesSchema),
  })
);

export type FindRulesSchema = t.TypeOf<typeof findRulesSchema>;
