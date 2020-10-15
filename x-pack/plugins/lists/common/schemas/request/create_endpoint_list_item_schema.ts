/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

import {
  ItemId,
  OsTypeArray,
  Tags,
  description,
  exceptionListItemType,
  meta,
  name,
  osTypeArrayOrUndefined,
  tags,
} from '../common/schemas';
import { RequiredKeepUndefined } from '../../types';
import { CreateCommentsArray, DefaultCreateCommentsArray } from '../types';
import { nonEmptyEndpointEntriesArray } from '../types/endpoint';
import { EntriesArray } from '../types/entries';
import { DefaultUuid } from '../../shared_imports';

export const createEndpointListItemSchema = t.intersection([
  t.exact(
    t.type({
      description,
      entries: nonEmptyEndpointEntriesArray,
      name,
      type: exceptionListItemType,
    })
  ),
  t.exact(
    t.partial({
      comments: DefaultCreateCommentsArray, // defaults to empty array if not set during decode
      item_id: DefaultUuid, // defaults to GUID (uuid v4) if not set during decode
      meta, // defaults to undefined if not set during decode
      os_types: osTypeArrayOrUndefined, // defaults to empty array if not set during decode
      tags, // defaults to empty array if not set during decode
    })
  ),
]);

export type CreateEndpointListItemSchema = t.OutputOf<typeof createEndpointListItemSchema>;

// This type is used after a decode since some things are defaults after a decode.
export type CreateEndpointListItemSchemaDecoded = Omit<
  RequiredKeepUndefined<t.TypeOf<typeof createEndpointListItemSchema>>,
  'tags' | 'item_id' | 'entries' | 'comments' | 'os_types'
> & {
  comments: CreateCommentsArray;
  tags: Tags;
  item_id: ItemId;
  entries: EntriesArray;
  os_types: OsTypeArray;
};
