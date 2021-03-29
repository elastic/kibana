/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';

export type JobId = string;
export type BucketSpan = string;

export type Job = estypes.Job;

export type AnalysisConfig = estypes.AnalysisConfig;

export type Detector = estypes.Detector;

export type AnalysisLimits = estypes.AnalysisLimits;

export type DataDescription = estypes.DataDescription;

export type ModelPlotConfig = estypes.ModelPlotConfig;

export type CustomRule = estypes.DetectionRule;

export interface PerPartitionCategorization {
  enabled?: boolean;
  stop_on_warn?: boolean;
}

export type CustomSettings = estypes.CustomSettings;
