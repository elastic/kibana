/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { either } from 'fp-ts/lib/Either';

export const DEFAULT_ANNOTATION_INDEX = 'observability-annotations';

/**
 * Checks whether a string is a valid ISO timestamp,
 * but doesn't convert it into a Date object when decoding.
 *
 * Copied from x-pack/plugins/observability_solution/apm/common/runtime_types/date_as_string_rt.ts.
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

export const rectFill = t.union([t.literal('inside'), t.literal('outside')]);

export const createAnnotationRt = t.intersection([
  t.type({
    annotation: t.partial({
      title: t.string,
      type: t.string,
      style: t.partial({
        icon: t.string,
        color: t.string,
        line: t.partial({
          width: t.number,
          style: t.union([t.literal('dashed'), t.literal('solid'), t.literal('dotted')]),
          iconPosition: t.union([t.literal('top'), t.literal('bottom')]),
          textDecoration: t.union([t.literal('none'), t.literal('name')]),
        }),
        rect: t.partial({
          fill: rectFill,
        }),
      }),
    }),
    '@timestamp': dateAsStringRt,
    message: t.string,
  }),
  t.partial({
    event: t.intersection([
      t.type({
        start: dateAsStringRt,
      }),
      t.partial({
        end: dateAsStringRt,
      }),
    ]),
    tags: t.array(t.string),
    service: t.partial({
      name: t.string,
      environment: t.string,
      version: t.string,
    }),
    monitor: t.partial({
      id: t.string,
    }),
    slo: t.intersection([
      t.type({
        id: t.string,
      }),
      t.partial({
        instanceId: t.string,
      }),
    ]),
    host: t.partial({
      name: t.string,
    }),
  }),
]);

export const deleteAnnotationRt = t.type({ id: t.string });

export const getAnnotationByIdRt = t.type({
  id: t.string,
});

export const findAnnotationRt = t.partial({
  query: t.string,
  start: t.string,
  end: t.string,
  sloId: t.string,
  sloInstanceId: t.string,
  serviceName: t.string,
  filter: t.string,
  size: t.number,
});

export const updateAnnotationRt = t.intersection([
  t.type({
    id: t.string,
  }),
  createAnnotationRt,
]);

export type CreateAnnotationParams = t.TypeOf<typeof createAnnotationRt>;
export type DeleteAnnotationParams = t.TypeOf<typeof deleteAnnotationRt>;
export type GetByIdAnnotationParams = t.TypeOf<typeof getAnnotationByIdRt>;
export type FindAnnotationParams = t.TypeOf<typeof findAnnotationRt>;

export type Annotation = t.TypeOf<typeof updateAnnotationRt>;
