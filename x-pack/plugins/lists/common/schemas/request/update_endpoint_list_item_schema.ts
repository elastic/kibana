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
  exceptionListItemType,
  id,
  meta,
  name,
  osTypeArrayOrUndefined,
  tags,
} from '../common/schemas';
import { RequiredKeepUndefined } from '../../types';
import {
  DefaultUpdateCommentsArray,
  EntriesArray,
  UpdateCommentsArray,
  nonEmptyEntriesArray,
} from '../types';

export const updateEndpointListItemSchema = t.intersection([
  t.exact(
    t.type({
      description,
      entries: nonEmptyEntriesArray,
      name,
      type: exceptionListItemType,
    })
  ),
  t.exact(
    t.partial({
      _version, // defaults to undefined if not set during decode
      comments: DefaultUpdateCommentsArray, // defaults to empty array if not set during decode
      id, // defaults to undefined if not set during decode
      item_id: t.union([t.string, t.undefined]),
      meta, // defaults to undefined if not set during decode
      os_types: osTypeArrayOrUndefined, // defaults to empty array if not set during decode
      tags, // defaults to empty array if not set during decode
    })
  ),
]);

export type UpdateEndpointListItemSchema = t.OutputOf<typeof updateEndpointListItemSchema>;

// This type is used after a decode since some things are defaults after a decode.
export type UpdateEndpointListItemSchemaDecoded = Omit<
  RequiredKeepUndefined<t.TypeOf<typeof updateEndpointListItemSchema>>,
  'tags' | 'entries' | 'comments'
> & {
  comments: UpdateCommentsArray;
  tags: Tags;
  entries: EntriesArray;
  os_types: OsTypeArray;
};
