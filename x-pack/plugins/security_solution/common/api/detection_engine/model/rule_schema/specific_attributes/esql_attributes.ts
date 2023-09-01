/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { PositiveIntegerGreaterThanZero } from '@kbn/securitysolution-io-ts-types';

export type EsqlSuppressionDuration = t.TypeOf<typeof EsqlSuppressionDuration>;
export const EsqlSuppressionDuration = t.type({
  value: PositiveIntegerGreaterThanZero,
  unit: t.keyof({
    s: null,
    m: null,
    h: null,
  }),
});

export type EsqlParams = t.TypeOf<typeof EsqlParams>;
export const EsqlParams = t.union([
  t.exact(
    t.partial({
      suppression_duration: EsqlSuppressionDuration,
      group_by_fields: t.array(t.string),
    })
  ),
  t.undefined,
]);

export type EsqlParamsCamel = t.TypeOf<typeof EsqlParamsCamel>;
export const EsqlParamsCamel = t.exact(
  t.partial({
    suppressionDuration: EsqlSuppressionDuration,
    groupByFields: t.array(t.string),
  })
);
