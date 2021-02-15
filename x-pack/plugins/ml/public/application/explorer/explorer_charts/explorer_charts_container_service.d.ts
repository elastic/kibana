/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JobId } from '../../../../common/types/anomaly_detection_jobs';

export interface ExplorerChartSeriesErrorMessages {
  [key: string]: Set<JobId>;
}
export declare interface ExplorerChartsData {
  chartsPerRow: number;
  seriesToPlot: any[];
  tooManyBuckets: boolean;
  timeFieldName: string;
  errorMessages: ExplorerChartSeriesErrorMessages;
}

export declare const getDefaultChartsData: () => ExplorerChartsData;

export declare const anomalyDataChange: (
  chartsContainerWidth: number,
  anomalyRecords: any[],
  earliestMs: number,
  latestMs: number,
  severity?: number
) => void;
