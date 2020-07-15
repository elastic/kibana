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
  description,
  exceptionListItemType,
  id,
  meta,
  name,
  tags,
} from '../common/schemas';
import { Identity, RequiredKeepUndefined } from '../../types';
import {
  DefaultEntryArray,
  DefaultUpdateCommentsArray,
  EntriesArray,
  UpdateCommentsArray,
} from '../types';

export const updateEndpointListItemSchema = t.intersection([
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
      comments: DefaultUpdateCommentsArray, // defaults to empty array if not set during decode
      entries: DefaultEntryArray, // defaults to empty array if not set during decode
      id, // defaults to undefined if not set during decode
      item_id: t.union([t.string, t.undefined]),
      meta, // defaults to undefined if not set during decode
      tags, // defaults to empty array if not set during decode
    })
  ),
]);

export type UpdateEndpointListItemSchemaPartial = Identity<
  t.TypeOf<typeof updateEndpointListItemSchema>
>;
export type UpdateEndpointListItemSchema = RequiredKeepUndefined<
  t.TypeOf<typeof updateEndpointListItemSchema>
>;

// This type is used after a decode since some things are defaults after a decode.
export type UpdateEndpointListItemSchemaDecoded = Identity<
  Omit<UpdateEndpointListItemSchema, '_tags' | 'tags' | 'entries' | 'comments'> & {
    _tags: _Tags;
    comments: UpdateCommentsArray;
    tags: Tags;
    entries: EntriesArray;
  }
>;
