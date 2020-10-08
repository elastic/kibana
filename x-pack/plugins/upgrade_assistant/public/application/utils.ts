/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { pipe } from 'fp-ts/lib/pipeable';
import { tryCatch, fold } from 'fp-ts/lib/Either';

export const validateRegExpString = (s: string) =>
  pipe(
    tryCatch(
      () => new RegExp(s),
      (e) => (e as Error).message
    ),
    fold(
      (errorMessage: string) => errorMessage,
      () => ''
    )
  );
