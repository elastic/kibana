/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import { NamespaceType, id, item_id, namespace_type } from '../common/schemas';

export const deleteExceptionListItemSchema = t.exact(
  t.partial({
    id,
    item_id,
    namespace_type, // defaults to 'single' if not set during decode
  })
);

export type DeleteExceptionListItemSchema = t.TypeOf<typeof deleteExceptionListItemSchema>;

// This type is used after a decode since some things are defaults after a decode.
export type DeleteExceptionListItemSchemaDecoded = Omit<
  DeleteExceptionListItemSchema,
  'namespace_type'
> & {
  namespace_type: NamespaceType;
};
