/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import moment from 'moment';
import { pipe } from 'fp-ts/lib/pipeable';
import { chain } from 'fp-ts/lib/Either';

export const timestampFromStringRT = new rt.Type<number, string>(
  'timestampFromStringRT',
  (input): input is number => typeof input === 'number',
  (input, context) =>
    pipe(
      rt.string.validate(input, context),
      chain((stringInput) => {
        const momentValue = moment.utc(stringInput);
        return momentValue.isValid()
          ? rt.success(momentValue.valueOf())
          : rt.failure(stringInput, context);
      })
    ),
  (output) => new Date(output).toISOString()
);

export const timeRangeRT = rt.type({
  min: timestampFromStringRT,
  max: timestampFromStringRT,
});

export type TimeRange = rt.TypeOf<typeof timeRangeRT>;
