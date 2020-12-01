/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';
import { MetricsAPITimerangeRT, MetricsAPISeriesRT } from '../metrics_api';

export const ProcessListAPIRequestRT = rt.type({
  hostTerm: rt.record(rt.string, rt.string),
  timerange: MetricsAPITimerangeRT,
  indexPattern: rt.string,
});

export const ProcessListAPIResponseRT = rt.array(MetricsAPISeriesRT);

export type ProcessListAPIRequest = rt.TypeOf<typeof ProcessListAPIRequestRT>;

export type ProcessListAPIResponse = rt.TypeOf<typeof ProcessListAPIResponseRT>;
