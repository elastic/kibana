/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

import {
  OsTypeArray,
  Tags,
  _version,
  description,
  exceptionListType,
  id,
  list_id,
  meta,
  name,
  namespace_type,
  osTypeArrayOrUndefined,
  tags,
  version,
} from '../common/schemas';
import { RequiredKeepUndefined } from '../../types';
import { NamespaceType } from '../types';

export const updateExceptionListSchema = t.intersection([
  t.exact(
    t.type({
      description,
      name,
      type: exceptionListType,
    })
  ),
  t.exact(
    t.partial({
      _version, // defaults to undefined if not set during decode
      id, // defaults to undefined if not set during decode
      list_id, // defaults to undefined if not set during decode
      meta, // defaults to undefined if not set during decode
      namespace_type, // defaults to 'single' if not set during decode
      os_types: osTypeArrayOrUndefined, // defaults to empty array if not set during decode
      tags, // defaults to empty array if not set during decode
      version, // defaults to undefined if not set during decode
    })
  ),
]);

export type UpdateExceptionListSchema = t.OutputOf<typeof updateExceptionListSchema>;

// This type is used after a decode since the arrays turn into defaults of empty arrays.
export type UpdateExceptionListSchemaDecoded = Omit<
  RequiredKeepUndefined<t.TypeOf<typeof updateExceptionListSchema>>,
  'tags | namespace_type' | 'os_types'
> & {
  tags: Tags;
  namespace_type: NamespaceType;
  os_types: OsTypeArray;
};
