/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import {
  EmptyStringArray,
  EmptyStringArrayDecoded,
  NonEmptyStringArray,
  StringToPositiveNumber,
} from '@kbn/securitysolution-io-ts-types';
import {
  DefaultNamespaceArray,
  DefaultNamespaceArrayTypeDecoded,
} from '@kbn/securitysolution-io-ts-list-types';

import { sort_field, sort_order } from '../common/schemas';
import { RequiredKeepUndefined } from '../../types';

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

export type FindExceptionListItemSchema = t.OutputOf<typeof findExceptionListItemSchema>;

// This type is used after a decode since some things are defaults after a decode.
export type FindExceptionListItemSchemaDecoded = Omit<
  RequiredKeepUndefined<t.TypeOf<typeof findExceptionListItemSchema>>,
  'namespace_type' | 'filter'
> & {
  filter: EmptyStringArrayDecoded;
  namespace_type: DefaultNamespaceArrayTypeDecoded;
};
