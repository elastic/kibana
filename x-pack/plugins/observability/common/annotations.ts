/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { either } from 'fp-ts/lib/Either';

/**
 * Checks whether a string is a valid ISO timestamp,
 * but doesn't convert it into a Date object when decoding.
 *
 * Copied from x-pack/plugins/apm/common/runtime_types/date_as_string_rt.ts.
 */
const dateAsStringRt = new t.Type<string, string, unknown>(
  'DateAsString',
  t.string.is,
  (input, context) =>
    either.chain(t.string.validate(input, context), (str) => {
      const date = new Date(str);
      return isNaN(date.getTime()) ? t.failure(input, context) : t.success(str);
    }),
  t.identity
);

export const createAnnotationRt = t.intersection([
  t.type({
    annotation: t.type({
      type: t.string,
    }),
    '@timestamp': dateAsStringRt,
    message: t.string,
  }),
  t.partial({
    tags: t.array(t.string),
    service: t.partial({
      name: t.string,
      environment: t.string,
      version: t.string,
    }),
  }),
]);

export const deleteAnnotationRt = t.type({
  id: t.string,
});

export const getAnnotationByIdRt = t.type({
  id: t.string,
});

export interface Annotation {
  annotation: {
    type: string;
  };
  tags?: string[];
  message: string;
  service?: {
    name?: string;
    environment?: string;
    version?: string;
  };
  event: {
    created: string;
  };
  '@timestamp': string;
}
