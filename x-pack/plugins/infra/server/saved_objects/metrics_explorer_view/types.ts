/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isoToEpochRt, nonEmptyStringRt } from '@kbn/io-ts-utils';
import * as rt from 'io-ts';

const metricsExplorerSavedObjectChartTypeRT = rt.keyof({ line: null, area: null, bar: null });
const metricsExplorerYAxisModeRT = rt.keyof({ fromZero: null, auto: null });

const metricsExplorerSavedObjectChartOptionsRT = rt.type({
  yAxisMode: metricsExplorerYAxisModeRT,
  type: metricsExplorerSavedObjectChartTypeRT,
  stack: rt.boolean,
});

export const metricsExplorerSavedObjectTimeOptionsRT = rt.type({
  from: rt.string,
  to: rt.string,
  interval: rt.string,
});
const metricsExplorerSavedObjectOptionsMetricRT = rt.intersection([
  rt.UnknownRecord,
  rt.partial({
    rate: rt.boolean,
    color: rt.string,
    label: rt.string,
  }),
]);

const metricExplorerSavedObjectOptionsRequiredRT = rt.type({
  aggregation: rt.string,
  metrics: rt.array(metricsExplorerSavedObjectOptionsMetricRT),
});

const metricExplorerSavedObjectOptionsOptionalRT = rt.partial({
  limit: rt.number,
  groupBy: rt.union([rt.string, rt.array(rt.string)]),
  filterQuery: rt.string,
  source: rt.string,
  forceInterval: rt.boolean,
  dropLastBucket: rt.boolean,
});
export const metricsExplorerSavedObjectOptionsRT = rt.intersection([
  metricExplorerSavedObjectOptionsRequiredRT,
  metricExplorerSavedObjectOptionsOptionalRT,
]);

const metricExplorerViewsSavedObjectStateRT = rt.type({
  chartOptions: metricsExplorerSavedObjectChartOptionsRT,
  currentTimerange: metricsExplorerSavedObjectTimeOptionsRT,
  options: metricsExplorerSavedObjectOptionsRT,
});

const metricsExplorerViewSavedObjectAttributesRT = rt.intersection([
  metricExplorerViewsSavedObjectStateRT,
  rt.type({
    name: nonEmptyStringRt,
  }),
  rt.partial({ isDefault: rt.boolean, isStatic: rt.boolean }),
]);

export const metricsExplorerViewSavedObjectRT = rt.intersection([
  rt.type({
    id: rt.string,
    attributes: metricsExplorerViewSavedObjectAttributesRT,
  }),
  rt.partial({
    version: rt.string,
    updated_at: isoToEpochRt,
  }),
]);
