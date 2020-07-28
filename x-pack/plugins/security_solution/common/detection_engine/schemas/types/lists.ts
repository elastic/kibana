/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

import { exceptionListType, namespaceType } from '../../../shared_imports';

export const list = t.exact(
  t.type({
    id: t.string,
    type: exceptionListType,
    namespace_type: namespaceType,
  })
);

export type List = t.TypeOf<typeof list>;
export const listArray = t.array(list);
export type ListArray = t.TypeOf<typeof listArray>;
export const listArrayOrUndefined = t.union([listArray, t.undefined]);
export type ListArrayOrUndefined = t.TypeOf<typeof listArrayOrUndefined>;
