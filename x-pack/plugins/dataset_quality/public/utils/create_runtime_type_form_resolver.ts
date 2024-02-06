/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fold } from 'fp-ts/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import { Context, ExactType, IntersectionType, Type, UnionType, ValidationError } from 'io-ts';
import { Resolver, ResolverError, ResolverSuccess } from 'react-hook-form';

export const createRuntimeTypeFormResolver =
  <T>(codec: Type<T>): Resolver<T> =>
  async (values) => {
    return pipe(
      codec.decode(values),
      fold(
        (errors): ResolverError<T> => {
          const x = {
            values: {},
            errors: Object.fromEntries(
              errors.map((error) => {
                return [
                  getErrorPath(error.context).join('.'),
                  {
                    type: 'validation',
                    message: formatError(error),
                  },
                ];
              })
            ) as any,
          };
          return x;
        },
        (decodedValue): ResolverSuccess<T> => ({ values: decodedValue, errors: {} })
      )
    );
  };

const skippedTypes = [IntersectionType, ExactType, UnionType];

const getErrorPath = ([first, ...rest]: Context): string[] => {
  if (typeof first === 'undefined') {
    return [];
  } else if (skippedTypes.some((skippedType) => first.type instanceof skippedType)) {
    return getErrorPath(rest);
  }

  return [first.key, ...getErrorPath(rest)];
};

const getErrorType = ({ context }: ValidationError) =>
  context[context.length - 1]?.type?.name ?? 'unknown';

const formatError = (error: ValidationError) =>
  error.message ??
  `${JSON.stringify(error.value)} does not match expected type ${getErrorType(error)}`;
