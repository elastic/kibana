/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import {
  ItemId,
  Tags,
  _Tags,
  _tags,
  description,
  exceptionListItemType,
  meta,
  name,
  tags,
} from '../common/schemas';
import { Identity, RequiredKeepUndefined } from '../../types';
import { CreateCommentsArray, DefaultCreateCommentsArray, DefaultEntryArray } from '../types';
import { EntriesArray } from '../types/entries';
import { DefaultUuid } from '../../siem_common_deps';

export const createEndpointListItemSchema = t.intersection([
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
      comments: DefaultCreateCommentsArray, // defaults to empty array if not set during decode
      entries: DefaultEntryArray, // defaults to empty array if not set during decode
      item_id: DefaultUuid, // defaults to GUID (uuid v4) if not set during decode
      meta, // defaults to undefined if not set during decode
      tags, // defaults to empty array if not set during decode
    })
  ),
]);

export type CreateEndpointListItemSchemaPartial = Identity<
  t.TypeOf<typeof createEndpointListItemSchema>
>;
export type CreateEndpointListItemSchema = RequiredKeepUndefined<
  t.TypeOf<typeof createEndpointListItemSchema>
>;

// This type is used after a decode since some things are defaults after a decode.
export type CreateEndpointListItemSchemaDecoded = Identity<
  Omit<CreateEndpointListItemSchema, '_tags' | 'tags' | 'item_id' | 'entries' | 'comments'> & {
    _tags: _Tags;
    comments: CreateCommentsArray;
    tags: Tags;
    item_id: ItemId;
    entries: EntriesArray;
  }
>;
