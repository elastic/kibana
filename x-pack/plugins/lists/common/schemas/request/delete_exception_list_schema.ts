/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import { id, list_id } from '../common/schemas';

export const deleteExceptionListSchema = t.exact(
  t.partial({
    id,
    list_id,
  })
);

export type DeleteExceptionListSchema = t.TypeOf<typeof deleteExceptionListSchema>;
