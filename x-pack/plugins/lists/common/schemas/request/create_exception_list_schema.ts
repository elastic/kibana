/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import {
  ListId,
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
import { DefaultUuid } from '../../siem_common_deps';

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
      namespace_type, // defaults to 'single' if not set during decode
      tags, // defaults to empty array if not set during decode
    })
  ),
]);

export type CreateExceptionListSchemaPartial = Identity<t.TypeOf<typeof createExceptionListSchema>>;
export type CreateExceptionListSchema = RequiredKeepUndefined<
  t.TypeOf<typeof createExceptionListSchema>
>;

// This type is used after a decode since some things are defaults after a decode.
export type CreateExceptionListSchemaDecoded = Identity<
  Omit<CreateExceptionListSchema, '_tags' | 'tags' | 'list_id' | 'namespace_type'> & {
    _tags: _Tags;
    tags: Tags;
    list_id: ListId;
    namespace_type: NamespaceType;
  }
>;
