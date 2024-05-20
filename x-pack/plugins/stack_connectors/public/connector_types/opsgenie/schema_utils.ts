/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import * as rt from 'io-ts';
import { exactCheck } from '@kbn/securitysolution-io-ts-utils';
import { identity } from 'fp-ts/lib/function';
import { isObject } from 'lodash';

const formatErrors = (errors: rt.Errors): string[] => {
  const err = errors.map((error) => {
    if (error.message != null) {
      return error.message;
    } else {
      const keyContext = error.context
        .filter(
          (entry) => entry.key != null && !Number.isInteger(+entry.key) && entry.key.trim() !== ''
        )
        .map((entry) => entry.key)
        .join('.');

      const nameContext = error.context.find(
        (entry) => entry.type != null && entry.type.name != null && entry.type.name.length > 0
      );

      const suppliedValue =
        keyContext !== '' ? keyContext : nameContext != null ? nameContext.type.name : '';
      const value = isObject(error.value) ? JSON.stringify(error.value) : error.value;
      return `Invalid value "${value}" supplied to "${suppliedValue}"`;
    }
  });

  return [...new Set(err)];
};

export const decodeSchema = <T>(schema: rt.Type<T>, data: unknown): T => {
  const onLeft = (errors: rt.Errors) => {
    throw new DecodeError(formatErrors(errors));
  };

  const onRight = (schemaType: T): T => identity(schemaType);

  return pipe(schema.decode(data), (decoded) => exactCheck(data, decoded), fold(onLeft, onRight));
};

export class DecodeError extends Error {
  constructor(public readonly decodeErrors: string[]) {
    super(decodeErrors.join());
    this.name = this.constructor.name;
  }
}

export function isDecodeError(error: unknown): error is DecodeError {
  return error instanceof DecodeError;
}
