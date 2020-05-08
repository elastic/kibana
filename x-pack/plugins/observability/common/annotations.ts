/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { dateAsStringRt } from '../../apm/common/runtime_types/date_as_string_rt';

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
