/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

import { NonEmptyString } from '../../shared_imports';
import { operator } from '../common/schemas';

export const entriesMatch = t.exact(
  t.type({
    field: NonEmptyString,
    operator,
    type: t.keyof({ match: null }),
    value: NonEmptyString,
  })
);
export type EntryMatch = t.TypeOf<typeof entriesMatch>;
