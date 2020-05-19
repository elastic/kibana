/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import {
  Tags,
  _Tags,
  _tags,
  comment,
  description,
  exceptionListItemType,
  id,
  meta,
  name,
  tags,
} from '../common/schemas';
import { Identity, RequiredKeepUndefined } from '../../types';
import { DefaultEntryArray } from '../types';
import { EntriesArray } from '../types/entries';

export const updateExceptionListItemSchema = t.intersection([
  t.exact(
    t.type({
      description,
      name,
      type: exceptionListItemType,
    })
  ),
  t.exact(
    t.partial({
      _tags, // defaults to empty array if not set during decode
      comment, // defaults to empty array if not set during decode
      entries: DefaultEntryArray, // defaults to empty array if not set during decode
      id, // defaults to undefined if not set during decode
      item_id: t.union([t.string, t.undefined]),
      meta, // defaults to undefined if not set during decode
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

// This type is used after a decode since the arrays turn into defaults of empty arrays
// and if a item_id is not specified it turns into a default GUID
export type UpdateExceptionListItemSchemaDecoded = Identity<
  Omit<UpdateExceptionListItemSchema, '_tags' | 'tags' | 'entries'> & {
    _tags: _Tags;
    tags: Tags;
    entries: EntriesArray;
  }
>;
