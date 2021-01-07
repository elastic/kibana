/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

import { id, list_id, namespace_type } from '../common/schemas';
import { NamespaceType } from '../types';
import { RequiredKeepUndefined } from '../../types';

export const deleteExceptionListSchema = t.exact(
  t.partial({
    id,
    list_id,
    namespace_type, // defaults to 'single' if not set during decode
  })
);

export type DeleteExceptionListSchema = t.OutputOf<typeof deleteExceptionListSchema>;

// This type is used after a decode since some things are defaults after a decode.
export type DeleteExceptionListSchemaDecoded = Omit<
  RequiredKeepUndefined<t.TypeOf<typeof deleteExceptionListSchema>>,
  'namespace_type'
> & {
  namespace_type: NamespaceType;
};
