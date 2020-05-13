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
  id,
  list_id,
  meta,
  name,
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
      _tags,
      id,
      list_id,
      meta,
      tags,
    })
  ),
]);

export type UpdateExceptionListSchemaPartial = Identity<t.TypeOf<typeof updateExceptionListSchema>>;
export type UpdateExceptionListSchema = RequiredKeepUndefined<
  t.TypeOf<typeof updateExceptionListSchema>
>;

// This type is used after a decode since the arrays turn into defaults of empty arrays.
export type UpdateExceptionListSchemaDecoded = Identity<
  UpdateExceptionListSchema & {
    _tags: _Tags;
    tags: Tags;
    list_id: ListId;
  }
>;
