/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import { sort_field, sort_order } from '../common/schemas';
import { RequiredKeepUndefined } from '../../types';
import { StringToPositiveNumber } from '../types/string_to_positive_number';
import {
  DefaultNamespaceArray,
  DefaultNamespaceArrayTypeDecoded,
} from '../types/default_namespace_array';
import { NonEmptyStringArray } from '../types/non_empty_string_array';
import { EmptyStringArray, EmptyStringArrayDecoded } from '../types/empty_string_array';

export const findExceptionListItemSchema = t.intersection([
  t.exact(
    t.type({
      list_id: NonEmptyStringArray,
    })
  ),
  t.exact(
    t.partial({
      filter: EmptyStringArray, // defaults to an empty array [] if not set during decode
      namespace_type: DefaultNamespaceArray, // defaults to ['single'] if not set during decode
      page: StringToPositiveNumber, // defaults to undefined if not set during decode
      per_page: StringToPositiveNumber, // defaults to undefined if not set during decode
      sort_field, // defaults to undefined if not set during decode
      sort_order, // defaults to undefined if not set during decode
    })
  ),
]);

export type FindExceptionListItemSchemaPartial = t.OutputOf<typeof findExceptionListItemSchema>;

// This type is used after a decode since some things are defaults after a decode.
export type FindExceptionListItemSchemaPartialDecoded = Omit<
  t.TypeOf<typeof findExceptionListItemSchema>,
  'namespace_type' | 'filter'
> & {
  filter: EmptyStringArrayDecoded;
  namespace_type: DefaultNamespaceArrayTypeDecoded;
};

// This type is used after a decode since some things are defaults after a decode.
export type FindExceptionListItemSchemaDecoded = RequiredKeepUndefined<
  FindExceptionListItemSchemaPartialDecoded
>;

export type FindExceptionListItemSchema = RequiredKeepUndefined<
  t.TypeOf<typeof findExceptionListItemSchema>
>;
