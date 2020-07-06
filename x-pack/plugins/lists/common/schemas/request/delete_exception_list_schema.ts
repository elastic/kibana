/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import { NamespaceType, id, list_id, namespace_type } from '../common/schemas';

export const deleteExceptionListSchema = t.exact(
  t.partial({
    id,
    list_id,
    namespace_type, // defaults to 'single' if not set during decode
  })
);

export type DeleteExceptionListSchema = t.TypeOf<typeof deleteExceptionListSchema>;

// This type is used after a decode since some things are defaults after a decode.
export type DeleteExceptionListSchemaDecoded = Omit<DeleteExceptionListSchema, 'namespace_type'> & {
  namespace_type: NamespaceType;
};
