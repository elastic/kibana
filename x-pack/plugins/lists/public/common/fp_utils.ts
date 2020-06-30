/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { TaskEither } from 'fp-ts/lib/TaskEither';
import { fold } from 'fp-ts/lib/Either';

export const toPromise = async <E, A>(taskEither: TaskEither<E, A>): Promise<A> =>
  pipe(
    await taskEither(),
    fold(
      (e) => Promise.reject(e),
      (a) => Promise.resolve(a)
    )
  );
