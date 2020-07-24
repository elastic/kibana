/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import { NonEmptyString } from '../../siem_common_deps';
import { operator } from '../common/schemas';

import { nonEmptyOrNullableStringArray } from './non_empty_or_nullable_string_array';

export const entriesMatchAny = t.exact(
  t.type({
    field: NonEmptyString,
    operator,
    type: t.keyof({ match_any: null }),
    value: nonEmptyOrNullableStringArray,
  })
);
export type EntryMatchAny = t.TypeOf<typeof entriesMatchAny>;
