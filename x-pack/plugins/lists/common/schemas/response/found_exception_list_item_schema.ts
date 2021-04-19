/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { page, per_page, total } from '../common/schemas';

import { exceptionListItemSchema } from './exception_list_item_schema';

export const foundExceptionListItemSchema = t.exact(
  t.type({
    data: t.array(exceptionListItemSchema),
    page,
    per_page,
    total,
  })
);

export type FoundExceptionListItemSchema = t.TypeOf<typeof foundExceptionListItemSchema>;
