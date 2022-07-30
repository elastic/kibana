/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import type {
  CreateCommentsArray,
  ItemId,
  EntriesArray,
  NamespaceType,
  OsTypeArray,
  Tags,
} from '@kbn/securitysolution-io-ts-list-types';
import {
  name,
  description,
  exceptionListItemType,
  nonEmptyEntriesArray,
  meta,
  osTypeArrayOrUndefined,
  namespaceType,
  tags,
  DefaultCreateCommentsArray,
} from '@kbn/securitysolution-io-ts-list-types';
import type { RequiredKeepUndefined } from '@kbn/osquery-plugin/common/types';
import { DefaultUuid } from '@kbn/securitysolution-io-ts-types';

export const createRuleExceptionListItemSchema = t.intersection([
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
      comments: DefaultCreateCommentsArray, // defaults to empty array if not set during decode
      item_id: DefaultUuid, // defaults to GUID (uuid v4) if not set during decode
      meta, // defaults to undefined if not set during decode
      namespace_type: namespaceType, // defaults to 'single' if not set during decode
      os_types: osTypeArrayOrUndefined, // defaults to empty array if not set during decode
      tags, // defaults to empty array if not set during decode
    })
  ),
]);

export const createRuleExceptionsSchema = t.exact(
  t.type({
    items: t.array(createRuleExceptionListItemSchema),
  })
);

export type CreateRuleExceptionListItemSchema = t.OutputOf<
  typeof createRuleExceptionListItemSchema
>;

// This type is used after a decode since some things are defaults after a decode.
export type CreateRuleExceptionListItemSchemaDecoded = Omit<
  RequiredKeepUndefined<t.TypeOf<typeof createRuleExceptionListItemSchema>>,
  'tags' | 'item_id' | 'entries' | 'namespace_type' | 'comments'
> & {
  comments: CreateCommentsArray;
  tags: Tags;
  item_id: ItemId;
  entries: EntriesArray;
  namespace_type: NamespaceType;
  os_types: OsTypeArray;
};

export type CreateRuleExceptionSchema = t.TypeOf<typeof createRuleExceptionsSchema>;

// This type is used after a decode since some things are defaults after a decode.
export type CreateRuleExceptionSchemaDecoded = Omit<
  RequiredKeepUndefined<t.TypeOf<typeof createRuleExceptionsSchema>>,
  'items'
> & {
  items: CreateRuleExceptionListItemSchemaDecoded[];
};
