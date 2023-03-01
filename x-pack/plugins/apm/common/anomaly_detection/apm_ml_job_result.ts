/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Coordinate } from '../../typings/timeseries';
import { ApmMlDetectorType } from './apm_ml_detectors';
import { ApmMlJob } from './apm_ml_job';

export interface ApmMlJobResult {
  job: ApmMlJob;
  type: ApmMlDetectorType;
  partition: string;
  by: string;
  anomalies: {
    actual: number | null;
    max: number;
  };
  bounds: {
    min: number | null;
    max: number | null;
  };
}

export type ApmMlJobResultWithTimeseries = ApmMlJobResult & {
  anomalies: {
    timeseries: Array<Coordinate & { actual: number | null }>;
  };
  bounds: {
    timeseries: Array<{ x: number; y0: number | null; y1: number | null }>;
  };
};
