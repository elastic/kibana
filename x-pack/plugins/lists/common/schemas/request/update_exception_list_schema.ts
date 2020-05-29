/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import {
  NamespaceType,
  Tags,
  _Tags,
  _tags,
  description,
  exceptionListType,
  meta,
  name,
  namespace_type,
  tags,
} from '../common/schemas';
import { Identity, RequiredKeepUndefined } from '../../types';

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
      _tags, // defaults to empty array if not set during decode
      id: t.union([t.string, t.undefined]), // defaults to undefined if not set during decode
      list_id: t.union([t.string, t.undefined]), // defaults to undefined if not set during decode
      meta, // defaults to undefined if not set during decode
      namespace_type, // defaults to 'single' if not set during decode
      tags, // defaults to empty array if not set during decode
    })
  ),
]);

export type UpdateExceptionListSchemaPartial = Identity<t.TypeOf<typeof updateExceptionListSchema>>;
export type UpdateExceptionListSchema = RequiredKeepUndefined<
  t.TypeOf<typeof updateExceptionListSchema>
>;

// This type is used after a decode since the arrays turn into defaults of empty arrays.
export type UpdateExceptionListSchemaDecoded = Identity<
  Omit<UpdateExceptionListSchema, '_tags | tags | namespace_type'> & {
    _tags: _Tags;
    tags: Tags;
    namespace_type: NamespaceType;
  }
>;
