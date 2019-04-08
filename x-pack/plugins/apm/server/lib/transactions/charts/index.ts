/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Setup } from '../../helpers/setup_request';
import { getAnomalySeries } from './get_anomaly_data';
import { AnomalyTimeSeriesResponse } from './get_anomaly_data/transform';
import { getApmTimeseriesData } from './get_timeseries_data';
import { ApmTimeSeriesResponse } from './get_timeseries_data/transform';

export interface TimeSeriesAPIResponse {
  apmTimeseries: ApmTimeSeriesResponse;
  anomalyTimeseries?: AnomalyTimeSeriesResponse;
}

function getDates(apmTimeseries: ApmTimeSeriesResponse) {
  return apmTimeseries.responseTimes.avg.map(p => p.x);
}

export async function getChartsData(options: {
  serviceName: string;
  transactionType?: string;
  transactionName?: string;
  setup: Setup;
}): Promise<TimeSeriesAPIResponse> {
  const apmTimeseries = await getApmTimeseriesData(options);
  const anomalyTimeseries = await getAnomalySeries({
    ...options,
    timeSeriesDates: getDates(apmTimeseries)
  });

  return {
    apmTimeseries,
    anomalyTimeseries
  };
}
