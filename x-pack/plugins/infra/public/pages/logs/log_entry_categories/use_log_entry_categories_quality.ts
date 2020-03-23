/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { JobSummary } from '../../../containers/logs/log_analysis';

interface QualityWarning {
  type: 'categoryQualityWarning';
  jobId: string;
}

export const useLogEntryCategoriesQuality = ({ jobSummaries }: { jobSummaries: JobSummary[] }) => {
  const categoryQualityWarnings: QualityWarning[] = jobSummaries
    .filter(jobSummary => jobSummary.fullJob?.model_size_stats?.categorization_status === 'warn')
    .map(jobSummary => ({
      type: 'categoryQualityWarning',
      jobId: jobSummary.id,
    }));

  return {
    categoryQualityWarnings,
  };
};
