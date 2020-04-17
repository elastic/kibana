/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { JsonObject } from '../../../../src/plugins/kibana_utils/common';
import { fromKueryExpression, toElasticsearchQuery } from '../../../../src/plugins/data/common';
import { dateAsStringRt } from '../../apm/common/runtime_types/date_as_string_rt';

const toEsQueryRt = new t.Type<JsonObject, string, unknown>(
  'elasticsearchQuery',
  (input): input is JsonObject => true,
  (input, context) => {
    if (!input) {
      return t.failure(input, context, 'input is empty');
    }
    try {
      const ast = fromKueryExpression(input);
      const filter = toElasticsearchQuery(ast);
      return t.success(filter);
    } catch (err) {
      return t.failure(input, context, err.message);
    }
  },
  () => {
    throw new Error('Cannot encode a decoded kuery expression');
  }
);

export const searchAnnotationsRt = t.intersection([
  t.type({
    start: t.number,
    end: t.number,
  }),
  t.partial({
    size: t.number,
    annotation: t.type({
      type: t.string,
    }),
    tags: t.array(t.string),
    filter: toEsQueryRt,
  }),
]);

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
