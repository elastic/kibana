/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import { NamespaceType, filter, namespace_type, sort_field, sort_order } from '../common/schemas';
import { RequiredKeepUndefined } from '../../types';
import { StringToPositiveNumber } from '../types/string_to_positive_number';

export const findExceptionListSchema = t.exact(
  t.partial({
    filter, // defaults to undefined if not set during decode
    namespace_type, // defaults to 'single' if not set during decode
    page: StringToPositiveNumber, // defaults to undefined if not set during decode
    per_page: StringToPositiveNumber, // defaults to undefined if not set during decode
    sort_field, // defaults to undefined if not set during decode
    sort_order, // defaults to undefined if not set during decode
  })
);

export type FindExceptionListSchemaPartial = t.TypeOf<typeof findExceptionListSchema>;

// This type is used after a decode since some things are defaults after a decode.
export type FindExceptionListSchemaPartialDecoded = Omit<
  FindExceptionListSchemaPartial,
  'namespace_type'
> & {
  namespace_type: NamespaceType;
};

// This type is used after a decode since some things are defaults after a decode.
export type FindExceptionListSchemaDecoded = RequiredKeepUndefined<
  FindExceptionListSchemaPartialDecoded
>;

export type FindExceptionListSchema = RequiredKeepUndefined<
  t.TypeOf<typeof findExceptionListSchema>
>;
