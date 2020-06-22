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
  created_at,
  created_by,
  description,
  exceptionListItemType,
  id,
  list_id,
  meta,
  name,
  namespace_type,
  tags,
  tie_breaker_id,
  updated_at,
  updated_by,
} from '../common/schemas';
import { Identity, RequiredKeepUndefined } from '../../types';
import {
  DefaultEntryArray,
  DefaultUpdateCommentsArray,
  EntriesArray,
  UpdateCommentsArray,
} from '../types';

export const updateExceptionListItemSchema = t.intersection([
  t.exact(
    t.type({
      created_at,
      created_by,
      description,
      list_id,
      name,
      tie_breaker_id,
      type: exceptionListItemType,
      updated_at,
      updated_by,
    })
  ),
  t.exact(
    t.partial({
      _tags, // defaults to empty array if not set during decode
      comments: DefaultUpdateCommentsArray, // defaults to empty array if not set during decode
      entries: DefaultEntryArray, // defaults to empty array if not set during decode
      id, // defaults to undefined if not set during decode
      item_id: t.union([t.string, t.undefined]),
      meta, // defaults to undefined if not set during decode
      namespace_type, // defaults to 'single' if not set during decode
      tags, // defaults to empty array if not set during decode
    })
  ),
]);

export type UpdateExceptionListItemSchemaPartial = Identity<
  t.TypeOf<typeof updateExceptionListItemSchema>
>;
export type UpdateExceptionListItemSchema = RequiredKeepUndefined<
  t.TypeOf<typeof updateExceptionListItemSchema>
>;

// This type is used after a decode since some things are defaults after a decode.
export type UpdateExceptionListItemSchemaDecoded = Identity<
  Omit<
    UpdateExceptionListItemSchema,
    '_tags' | 'tags' | 'entries' | 'namespace_type' | 'comments'
  > & {
    _tags: _Tags;
    comments: UpdateCommentsArray;
    tags: Tags;
    entries: EntriesArray;
    namespace_type: NamespaceType;
  }
>;
