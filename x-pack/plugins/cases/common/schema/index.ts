/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { either } from 'fp-ts/lib/Either';

export interface LimitedStringSchemaType {
  fieldName: string;
  min: number;
  max: number;
}

export const NonEmptyString = new rt.Type<string, string, unknown>(
  'NonEmptyString',
  rt.string.is,
  (input, context) =>
    either.chain(rt.string.validate(input, context), (s) => {
      if (s.trim() !== '') {
        return rt.success(s);
      } else {
        return rt.failure(input, context, 'string must have length >= 1');
      }
    }),
  rt.identity
);

export const limitedStringSchema = ({ fieldName, min, max }: LimitedStringSchemaType) =>
  new rt.Type<string, string, unknown>(
    'LimitedString',
    rt.string.is,
    (input, context) =>
      either.chain(rt.string.validate(input, context), (s) => {
        const trimmedString = s.trim();

        if (trimmedString.length === 0 && trimmedString.length < min) {
          return rt.failure(input, context, `The ${fieldName} field cannot be an empty string.`);
        }

        if (trimmedString.length < min) {
          return rt.failure(
            input,
            context,
            `The length of the ${fieldName} is too short. The minimum length is ${min}.`
          );
        }

        if (trimmedString.length > max) {
          return rt.failure(
            input,
            context,
            `The length of the ${fieldName} is too long. The maximum length is ${max}.`
          );
        }

        return rt.success(s);
      }),
    rt.identity
  );

export const limitedArraySchema = <T extends rt.Mixed>({
  codec,
  fieldName,
  min,
  max,
}: { codec: T } & LimitedStringSchemaType) =>
  new rt.Type<Array<rt.TypeOf<typeof codec>>, Array<rt.TypeOf<typeof codec>>, unknown>(
    'LimitedArray',
    (input): input is T[] => rt.array(codec).is(input),
    (input, context) =>
      either.chain(rt.array(codec).validate(input, context), (s) => {
        if (s.length < min) {
          return rt.failure(
            input,
            context,
            `The length of the field ${fieldName} is too short. Array must be of length >= ${min}.`
          );
        }

        if (s.length > max) {
          return rt.failure(
            input,
            context,
            `The length of the field ${fieldName} is too long. Array must be of length <= ${max}.`
          );
        }

        return rt.success(s);
      }),
    rt.identity
  );
