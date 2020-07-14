/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import { id, list_id, namespace_type } from '../common/schemas';
import { RequiredKeepUndefined } from '../../types';
import { NamespaceType } from '../types';

export const readExceptionListSchema = t.exact(
  t.partial({
    id,
    list_id,
    namespace_type, // defaults to 'single' if not set during decode
  })
);

export type ReadExceptionListSchemaPartial = t.TypeOf<typeof readExceptionListSchema>;

// This type is used after a decode since some things are defaults after a decode.
export type ReadExceptionListSchemaPartialDecoded = Omit<
  ReadExceptionListSchemaPartial,
  'namespace_type'
> & {
  namespace_type: NamespaceType;
};

// This type is used after a decode since some things are defaults after a decode.
export type ReadExceptionListSchemaDecoded = RequiredKeepUndefined<
  ReadExceptionListSchemaPartialDecoded
>;

export type ReadExceptionListSchema = RequiredKeepUndefined<ReadExceptionListSchemaPartial>;
