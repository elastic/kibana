/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

import { NonEmptyString } from '../../../shared_imports';
import { operatorIncluded } from '../../common/schemas';
import { nonEmptyOrNullableStringArray } from '../non_empty_or_nullable_string_array';

export const endpointEntryMatchAny = t.exact(
  t.type({
    field: NonEmptyString,
    operator: operatorIncluded,
    type: t.keyof({ match_any: null }),
    value: nonEmptyOrNullableStringArray,
  })
);
export type EndpointEntryMatchAny = t.TypeOf<typeof endpointEntryMatchAny>;
