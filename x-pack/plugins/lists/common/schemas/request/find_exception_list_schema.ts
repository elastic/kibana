/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import {
  DefaultNamespaceArray,
  NamespaceTypeArray,
  StringToPositiveNumber,
} from '@kbn/securitysolution-io-ts-utils';

import { filter, sort_field, sort_order } from '../common/schemas';
import { RequiredKeepUndefined } from '../../types';

export const findExceptionListSchema = t.exact(
  t.partial({
    filter, // defaults to undefined if not set during decode
    namespace_type: DefaultNamespaceArray, // defaults to 'single' if not set during decode
    page: StringToPositiveNumber, // defaults to undefined if not set during decode
    per_page: StringToPositiveNumber, // defaults to undefined if not set during decode
    sort_field, // defaults to undefined if not set during decode
    sort_order, // defaults to undefined if not set during decode
  })
);

export type FindExceptionListSchema = t.OutputOf<typeof findExceptionListSchema>;

// This type is used after a decode since some things are defaults after a decode.
export type FindExceptionListSchemaDecoded = Omit<
  RequiredKeepUndefined<t.TypeOf<typeof findExceptionListSchema>>,
  'namespace_type'
> & {
  namespace_type: NamespaceTypeArray;
};
