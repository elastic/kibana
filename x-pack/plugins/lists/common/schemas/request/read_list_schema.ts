/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import { id } from '../common/schemas';

export const readListSchema = t.exact(
  t.type({
    id,
  })
);

export type ReadListSchema = t.TypeOf<typeof readListSchema>;
