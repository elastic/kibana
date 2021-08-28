/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createContext } from 'react';
import type { Aggregation, Field } from '../../../../../../common/types/fields';
import type { ExistingJobsAndGroups } from '../../../../services/job_service';
import { TimeBuckets } from '../../../../util/time_buckets';
import { ChartLoader } from '../../common/chart_loader/chart_loader';
import { SingleMetricJobCreator } from '../../common/job_creator/single_metric_job_creator';
import type { JobCreatorType } from '../../common/job_creator/type_guards';
import { JobValidator } from '../../common/job_validator/job_validator';
import { ResultsLoader } from '../../common/results_loader/results_loader';

export interface JobCreatorContextValue {
  jobCreatorUpdated: number;
  jobCreatorUpdate: () => void;
  jobCreator: JobCreatorType;
  chartLoader: ChartLoader;
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
  resultsLoader: {} as ResultsLoader,
  chartInterval: {} as TimeBuckets,
  jobValidator: {} as JobValidator,
  jobValidatorUpdated: 0,
  fields: [],
  aggs: [],
  existingJobsAndGroups: {} as ExistingJobsAndGroups,
});
