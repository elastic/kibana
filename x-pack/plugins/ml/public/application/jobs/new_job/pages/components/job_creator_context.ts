/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext } from 'react';
import type { Field, Aggregation } from '@kbn/ml-anomaly-utils';
import type { TimeBuckets } from '@kbn/ml-time-buckets';
import type { JobCreatorType, SingleMetricJobCreator } from '../../common/job_creator';
import type { ChartLoader } from '../../common/chart_loader';
import type { MapLoader } from '../../common/map_loader';
import type { ResultsLoader } from '../../common/results_loader';
import type { JobValidator } from '../../common/job_validator';
import type { ExistingJobsAndGroups } from '../../../../services/job_service';

export interface JobCreatorContextValue {
  jobCreatorUpdated: number;
  jobCreatorUpdate: () => void;
  jobCreator: JobCreatorType;
  chartLoader: ChartLoader;
  mapLoader: MapLoader;
  resultsLoader: ResultsLoader;
  chartInterval: TimeBuckets;
  jobValidator: JobValidator;
  jobValidatorUpdated: number;
  fields: Field[];
  aggs: Aggregation[];
  existingJobsAndGroups: ExistingJobsAndGroups;
}

export const JobCreatorContext = createContext<JobCreatorContextValue>({
  jobCreatorUpdated: 0,
  jobCreatorUpdate: () => {},
  jobCreator: {} as SingleMetricJobCreator,
  chartLoader: {} as ChartLoader,
  mapLoader: {} as MapLoader,
  resultsLoader: {} as ResultsLoader,
  chartInterval: {} as TimeBuckets,
  jobValidator: {} as JobValidator,
  jobValidatorUpdated: 0,
  fields: [],
  aggs: [],
  existingJobsAndGroups: {} as ExistingJobsAndGroups,
});
