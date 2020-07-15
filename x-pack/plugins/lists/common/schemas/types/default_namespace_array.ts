/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';

import { namespaceType } from './default_namespace';

export const namespaceTypeArray = t.array(namespaceType);
export type NamespaceTypeArray = t.TypeOf<typeof namespaceTypeArray>;

/**
 * Types the DefaultNamespaceArray as:
 *   - If null or undefined, then a default string array of "single" will be used.
 *   - If it contains a string, then it is split along the commas and puts them into an array and validates it
 */
export const DefaultNamespaceArray = new t.Type<
  NamespaceTypeArray,
  string | undefined | null,
  unknown
>(
  'DefaultNamespaceArray',
  namespaceTypeArray.is,
  (input, context): Either<t.Errors, NamespaceTypeArray> => {
    if (input == null) {
      return t.success(['single']);
    } else if (typeof input === 'string') {
      const commaSeparatedValues = input
        .trim()
        .split(',')
        .map((value) => value.trim());
      return namespaceTypeArray.validate(commaSeparatedValues, context);
    }
    return t.failure(input, context);
  },
  String
);

export type DefaultNamespaceC = typeof DefaultNamespaceArray;

export type DefaultNamespaceArrayTypeEncoded = t.OutputOf<typeof DefaultNamespaceArray>;
export type DefaultNamespaceArrayTypeDecoded = t.TypeOf<typeof DefaultNamespaceArray>;
