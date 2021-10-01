/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import { Job } from '../../../common/types/anomaly_detection_jobs';

export interface ForecastData {
  success: boolean;
  results: any;
}

export interface ForecastDateRange {
  earliest: number;
  latest: number;
}

export const mlForecastService: {
  getForecastData: (
    job: Job,
    detectorIndex: number,
    forecastId: string,
    entityFields: any[],
    earliestMs: number,
    latestMs: number,
    intervalMs: number,
    aggType: any
  ) => Observable<ForecastData>;

  getForecastDateRange: (job: Job, forecastId: string) => Promise<ForecastDateRange>;
};
