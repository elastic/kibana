/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import {
  NamespaceType,
  filter,
  list_id,
  namespace_type,
  sort_field,
  sort_order,
} from '../common/schemas';
import { RequiredKeepUndefined } from '../../types';
import { StringToPositiveNumber } from '../types/string_to_positive_number';

export const findExceptionListItemSchema = t.intersection([
  t.exact(
    t.type({
      list_id,
    })
  ),
  t.exact(
    t.partial({
      filter, // defaults to undefined if not set during decode
      namespace_type, // defaults to 'single' if not set during decode
      page: StringToPositiveNumber, // defaults to undefined if not set during decode
      per_page: StringToPositiveNumber, // defaults to undefined if not set during decode
      sort_field, // defaults to undefined if not set during decode
      sort_order, // defaults to undefined if not set during decode
    })
  ),
]);

export type FindExceptionListItemSchemaPartial = t.TypeOf<typeof findExceptionListItemSchema>;

// This type is used after a decode since some things are defaults after a decode.
export type FindExceptionListItemSchemaPartialDecoded = Omit<
  FindExceptionListItemSchemaPartial,
  'namespace_type'
> & {
  namespace_type: NamespaceType;
};

// This type is used after a decode since some things are defaults after a decode.
export type FindExceptionListItemSchemaDecoded = RequiredKeepUndefined<
  FindExceptionListItemSchemaPartialDecoded
>;

export type FindExceptionListItemSchema = RequiredKeepUndefined<
  t.TypeOf<typeof findExceptionListItemSchema>
>;
