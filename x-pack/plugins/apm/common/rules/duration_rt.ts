/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { either } from 'fp-ts/lib/Either';
import * as t from 'io-ts';
import { parseInterval } from '../../../../../src/plugins/data/common';

type Duration = string;

export const durationRt = new t.Type<Duration, string, unknown>(
  'duration',
  (u): u is Duration => {
    return true;
  },
  (input, context) => {
    return either.chain(
      t.string.validate(input, context),
      (durationAsString) => {
        const interval = parseInterval(durationAsString);

        if (interval) {
          return t.success(durationAsString);
        }
        return t.failure(input, context, 'Failed to parse duration');
      }
    );
  },
  (a) => a
);
