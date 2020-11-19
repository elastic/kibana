/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

import { NonEmptyString } from '../../shared_imports';
import { operator, type } from '../common/schemas';

export const entriesList = t.exact(
  t.type({
    field: NonEmptyString,
    list: t.exact(t.type({ id: NonEmptyString, type })),
    operator,
    type: t.keyof({ list: null }),
  })
);
export type EntryList = t.TypeOf<typeof entriesList>;
