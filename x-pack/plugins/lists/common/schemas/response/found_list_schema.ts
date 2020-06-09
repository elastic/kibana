/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import { cursor, page, per_page, total } from '../common/schemas';

import { listSchema } from './list_schema';

export const foundListSchema = t.exact(
  t.type({
    cursor,
    data: t.array(listSchema),
    page,
    per_page,
    total,
  })
);

export type FoundListSchema = t.TypeOf<typeof foundListSchema>;
