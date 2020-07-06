/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { left, Either, fold, right } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import { isObject, get } from 'lodash/fp';

/**
 * Given an original object and a decoded object this will return an error
 * if and only if the original object has additional keys that the decoded
 * object does not have. If the original decoded already has an error, then
 * this will return the error as is and not continue.
 *
 * NOTE: You MUST use t.exact(...) for this to operate correctly as your schema
 * needs to remove additional keys before the compare
 *
 * You might not need this in the future if the below issue is solved:
 * https://github.com/gcanti/io-ts/issues/322
 *
 * @param original The original to check if it has additional keys
 * @param decoded The decoded either which has either an existing error or the
 * decoded object which could have additional keys stripped from it.
 */
export const exactCheck = <T>(
  original: unknown,
  decoded: Either<t.Errors, T>
): Either<t.Errors, T> => {
  const onLeft = (errors: t.Errors): Either<t.Errors, T> => left(errors);
  const onRight = (decodedValue: T): Either<t.Errors, T> => {
    const differences = findDifferencesRecursive(original, decodedValue);
    if (differences.length !== 0) {
      const validationError: t.ValidationError = {
        value: differences,
        context: [],
        message: `invalid keys "${differences.join(',')}"`,
      };
      const error: t.Errors = [validationError];
      return left(error);
    } else {
      return right(decodedValue);
    }
  };
  return pipe(decoded, fold(onLeft, onRight));
};

export const findDifferencesRecursive = <T>(original: unknown, decodedValue: T): string[] => {
  if (decodedValue === null && original === null) {
    // both the decodedValue and the original are null which indicates that they are equal
    // so do not report differences
    return [];
  } else if (decodedValue == null) {
    try {
      // It is null and painful when the original contains an object or an array
      // the the decoded value does not have.
      return [JSON.stringify(original)];
    } catch (err) {
      return ['circular reference'];
    }
  } else if (typeof original !== 'object' || original == null) {
    // We are not an object or null so do not report differences
    return [];
  } else {
    const decodedKeys = Object.keys(decodedValue);
    const differences = Object.keys(original).flatMap((originalKey) => {
      const foundKey = decodedKeys.some((key) => key === originalKey);
      const topLevelKey = foundKey ? [] : [originalKey];
      // I use lodash to cheat and get an any (not going to lie ;-))
      const valueObjectOrArrayOriginal = get(originalKey, original);
      const valueObjectOrArrayDecoded = get(originalKey, decodedValue);
      if (isObject(valueObjectOrArrayOriginal)) {
        return [
          ...topLevelKey,
          ...findDifferencesRecursive(valueObjectOrArrayOriginal, valueObjectOrArrayDecoded),
        ];
      } else if (Array.isArray(valueObjectOrArrayOriginal)) {
        return [
          ...topLevelKey,
          ...valueObjectOrArrayOriginal.flatMap((arrayElement, index) =>
            findDifferencesRecursive(arrayElement, get(index, valueObjectOrArrayDecoded))
          ),
        ];
      } else {
        return topLevelKey;
      }
    });
    return differences;
  }
};
