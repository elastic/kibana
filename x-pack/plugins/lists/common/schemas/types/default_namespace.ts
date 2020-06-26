/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';

export const namespaceType = t.keyof({ agnostic: null, single: null });

type NamespaceType = t.TypeOf<typeof namespaceType>;

export type DefaultNamespaceC = t.Type<NamespaceType, NamespaceType, unknown>;

/**
 * Types the DefaultNamespace as:
 *   - If null or undefined, then a default string/enumeration of "single" will be used.
 */
export const DefaultNamespace: DefaultNamespaceC = new t.Type<
  NamespaceType,
  NamespaceType,
  unknown
>(
  'DefaultNamespace',
  namespaceType.is,
  (input, context): Either<t.Errors, NamespaceType> =>
    input == null ? t.success('single') : namespaceType.validate(input, context),
  t.identity
);
