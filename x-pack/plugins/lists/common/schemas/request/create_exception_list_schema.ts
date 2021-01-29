/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

import {
  ListId,
  OsTypeArray,
  Tags,
  description,
  exceptionListType,
  meta,
  name,
  namespace_type,
  osTypeArrayOrUndefined,
  tags,
} from '../common/schemas';
import { RequiredKeepUndefined } from '../../types';
import {
  DefaultUuid,
  DefaultVersionNumber,
  DefaultVersionNumberDecoded,
} from '../../shared_imports';
import { NamespaceType } from '../types';

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
      list_id: DefaultUuid, // defaults to a GUID (UUID v4) string if not set during decode
      meta, // defaults to undefined if not set during decode
      namespace_type, // defaults to 'single' if not set during decode
      os_types: osTypeArrayOrUndefined, // defaults to empty array if not set during decode
      tags, // defaults to empty array if not set during decode
      version: DefaultVersionNumber, // defaults to numerical 1 if not set during decode
    })
  ),
]);

export type CreateExceptionListSchema = t.OutputOf<typeof createExceptionListSchema>;

// This type is used after a decode since some things are defaults after a decode.
export type CreateExceptionListSchemaDecoded = Omit<
  RequiredKeepUndefined<t.TypeOf<typeof createExceptionListSchema>>,
  'tags' | 'list_id' | 'namespace_type' | 'os_types'
> & {
  tags: Tags;
  list_id: ListId;
  namespace_type: NamespaceType;
  os_types: OsTypeArray;
  version: DefaultVersionNumberDecoded;
};
