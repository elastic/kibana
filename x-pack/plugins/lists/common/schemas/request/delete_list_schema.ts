/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import { id } from '../common/schemas';

export const deleteListSchema = t.exact(
  t.type({
    id,
  })
);

export type DeleteListSchema = t.TypeOf<typeof deleteListSchema>;
export type DeleteListSchemaEncoded = t.OutputOf<typeof deleteListSchema>;
