/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mlJobService } from '../services/job_service';
export const UNKNOWN_METRIC_PLOT_FUNCTION = 'unknown';

export const getPlotByOptions = (
  selectedJobId: string,
  selectedDetectorIndex: number,
  currentActualPlotFunction: string | undefined,
  defaultFunctionToPlotIfMetric: string | undefined
) => {
  // only load the options to view chart by 'avg', 'min', or 'max'
  // if the original function is 'metric'
  const selectedJob = mlJobService.getJob(selectedJobId);

  if (selectedJob === undefined) return;

  const detectors = selectedJob.analysis_config.detectors;

  if (detectors && detectors[selectedDetectorIndex]?.function) {
    if (detectors[selectedDetectorIndex]?.function === 'metric') {
      if (currentActualPlotFunction === undefined) {
        // here we just know the detector is a metric function, but we don't know what to plot yet
        // need to find the highest scoring anomaly record in order to pick the default view
        return defaultFunctionToPlotIfMetric || UNKNOWN_METRIC_PLOT_FUNCTION;
      }
    } else {
      return undefined;
    }
  }
};
