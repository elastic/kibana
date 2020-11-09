/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

import { id, item_id, namespace_type } from '../common/schemas';
import { RequiredKeepUndefined } from '../../types';
import { NamespaceType } from '../types';

export const readExceptionListItemSchema = t.exact(
  t.partial({
    id,
    item_id,
    namespace_type, // defaults to 'single' if not set during decode
  })
);

export type ReadExceptionListItemSchema = t.OutputOf<typeof readExceptionListItemSchema>;

// This type is used after a decode since some things are defaults after a decode.
export type ReadExceptionListItemSchemaDecoded = Omit<
  RequiredKeepUndefined<t.TypeOf<typeof readExceptionListItemSchema>>,
  'namespace_type'
> & {
  namespace_type: NamespaceType;
};
