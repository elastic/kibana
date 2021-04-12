/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { exceptionListType, namespaceType } from '../../../shared_imports';

import { NonEmptyString } from './non_empty_string';

export const list = t.exact(
  t.type({
    id: NonEmptyString,
    list_id: NonEmptyString,
    type: exceptionListType,
    namespace_type: namespaceType,
  })
);

export type List = t.TypeOf<typeof list>;
export const listArray = t.array(list);
export type ListArray = t.TypeOf<typeof listArray>;
export const listArrayOrUndefined = t.union([listArray, t.undefined]);
export type ListArrayOrUndefined = t.TypeOf<typeof listArrayOrUndefined>;
