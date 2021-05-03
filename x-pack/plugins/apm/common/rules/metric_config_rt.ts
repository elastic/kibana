/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { jsonRt } from '@kbn/io-ts-utils';
import * as t from 'io-ts';
import { durationRt } from './duration_rt';

const groupsRt = t.intersection([
  t.partial({
    limit: t.number,
  }),
  t.type({
    sources: t.record(
      t.string,
      t.intersection([
        t.type({
          field: t.string,
        }),
        t.partial({
          missing: t.boolean,
        }),
      ])
    ),
  }),
]);

const indexRt = t.union([t.string, t.array(t.string)]);

const kqlRt = t.string;

const filterRt = t.partial({
  filter: kqlRt,
});

const rangeRt = t.type({
  range: durationRt,
});

const fieldRt = t.type({
  field: t.string,
});

function createAggOverTimeRt<TProps extends t.Props>(
  props: TProps
): t.IntersectionC<[t.TypeC<TProps>, typeof filterRt, typeof rangeRt]> {
  return t.intersection([t.type(props), filterRt, rangeRt]);
}

const countOverTimeRt = createAggOverTimeRt({ count_over_time: t.strict({}) });

const sumOverTimeRt = createAggOverTimeRt({ sum_over_time: fieldRt });
const minOverTimeRt = createAggOverTimeRt({ min_over_time: fieldRt });
const maxOverTimeRt = createAggOverTimeRt({ max_over_time: fieldRt });
const avgOverTimeRt = createAggOverTimeRt({ avg_over_time: fieldRt });

const expressionRt = t.type({
  expression: t.string,
});

const metricExpressionRt = t.intersection([
  expressionRt,
  t.partial({
    record: t.boolean,
  }),
]);

const metricAggregationRt = t.union([
  countOverTimeRt,
  sumOverTimeRt,
  avgOverTimeRt,
  minOverTimeRt,
  maxOverTimeRt,
]);

const metricsRt = t.record(
  t.string,
  t.union([metricAggregationRt, metricExpressionRt])
);

const alertStateRt = t.union([
  t.literal('ok'),
  t.literal('warning'),
  t.literal('critical'),
  t.literal('unknown'),
]);

const compositeAlertRt = t.type({
  composite: t.type({}),
});

const thresholdAlertRt = t.type({
  threshold: t.type({
    metric: t.string,
    thresholds: t.record(alertStateRt, t.number),
  }),
});

const alertRt = t.union([thresholdAlertRt, compositeAlertRt]);

const passRt = t.intersection([
  t.type({
    index: indexRt,
    metrics: metricsRt,
  }),
  t.partial({
    filter: kqlRt,
  }),
]);

const passesRt = t.array(passRt);

const metricConfigRt = t.intersection([
  t.type({
    step: durationRt,
    query_delay: durationRt,
    passes: jsonRt.pipe(passesRt),
  }),
  t.partial({
    groups: groupsRt,
    alert: alertRt,
  }),
]);

export {
  metricConfigRt,
  minOverTimeRt,
  maxOverTimeRt,
  sumOverTimeRt,
  avgOverTimeRt,
  countOverTimeRt,
  thresholdAlertRt,
  compositeAlertRt,
  metricExpressionRt,
  metricAggregationRt,
  groupsRt,
  passRt,
};

export type MetricAggregationConfig = t.TypeOf<typeof metricAggregationRt>;
export type MetricExpressionConfig = t.TypeOf<typeof metricExpressionRt>;
export type Pass = t.TypeOf<typeof passRt>;
export type Groups = t.TypeOf<typeof groupsRt>;
