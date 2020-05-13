/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import {
  ListId,
  Tags,
  _Tags,
  _tags,
  description,
  exceptionListType,
  meta,
  name,
  tags,
} from '../common/schemas';
import { Identity, RequiredKeepUndefined } from '../../types';
import { DefaultUuid } from '../types/default_uuid';

export const createExceptionListSchema = t.intersection([
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
      list_id: DefaultUuid, // defaults to a GUID (UUID v4) string if not set during decode
      meta, // defaults to undefined if not set during decode
      tags, // defaults to empty array if not set during decode
    })
  ),
]);

export type CreateExceptionListSchemaPartial = Identity<t.TypeOf<typeof createExceptionListSchema>>;
export type CreateExceptionListSchema = RequiredKeepUndefined<
  t.TypeOf<typeof createExceptionListSchema>
>;

// This type is used after a decode since the arrays turn into defaults of empty arrays.
export type CreateExceptionListSchemaDecoded = Identity<
  CreateExceptionListSchema & {
    _tags: _Tags;
    tags: Tags;
    list_id: ListId;
  }
>;
