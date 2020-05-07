/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

export const HistogramDataPointType = t.partial({
  upCount: t.number,
  downCount: t.number,
  x: t.number,
  x0: t.number,
  y: t.number,
});

export type HistogramDataPoint = t.TypeOf<typeof HistogramDataPointType>;

export const GetPingHistogramParamsType = t.intersection([
  t.type({
    dateStart: t.string,
    dateEnd: t.string,
  }),
  t.partial({
    filters: t.string,
    monitorId: t.string,
  }),
]);

export type GetPingHistogramParams = t.TypeOf<typeof GetPingHistogramParamsType>;

export const HistogramResultType = t.type({
  histogram: t.array(HistogramDataPointType),
  interval: t.string,
});

export type HistogramResult = t.TypeOf<typeof HistogramResultType>;

export interface HistogramQueryResult {
  key: number;
  key_as_string: string;
  doc_count: number;
  down: {
    doc_count: number;
  };
  up: {
    doc_count: number;
  };
}
