/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { NamespaceType, id } from '@kbn/securitysolution-io-ts-utils';

import { list_id, namespace_type } from '../common/schemas';
import { RequiredKeepUndefined } from '../../types';

export const readExceptionListSchema = t.exact(
  t.partial({
    id,
    list_id,
    namespace_type, // defaults to 'single' if not set during decode
  })
);

export type ReadExceptionListSchema = t.OutputOf<typeof readExceptionListSchema>;

// This type is used after a decode since some things are defaults after a decode.
export type ReadExceptionListSchemaDecoded = Omit<
  RequiredKeepUndefined<t.TypeOf<typeof readExceptionListSchema>>,
  'namespace_type'
> & {
  namespace_type: NamespaceType;
};
