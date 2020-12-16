/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

import { id, list_id, namespace_type } from '../common/schemas';
import { RequiredKeepUndefined } from '../../types';

export const exportExceptionListQuerySchema = t.exact(
  t.type({
    id,
    list_id,
    namespace_type,
    // TODO: Add file_name here with a default value
  })
);

export type ExportExceptionListQuerySchema = RequiredKeepUndefined<
  t.TypeOf<typeof exportExceptionListQuerySchema>
>;
export type ExportExceptionListQuerySchemaEncoded = t.OutputOf<
  typeof exportExceptionListQuerySchema
>;
