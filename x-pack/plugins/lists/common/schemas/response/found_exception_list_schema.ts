/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import { page, per_page, total } from '../common/schemas';

import { exceptionListSchema } from './exception_list_schema';

export const foundExceptionListSchema = t.exact(
  t.type({
    data: t.array(exceptionListSchema),
    page,
    per_page,
    total,
  })
);

export type FoundExceptionListSchema = t.TypeOf<typeof foundExceptionListSchema>;
