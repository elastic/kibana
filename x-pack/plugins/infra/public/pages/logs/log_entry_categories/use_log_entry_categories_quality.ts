/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { JobModelSizeStats, JobSummary } from '../../../containers/logs/log_analysis';
import { QualityWarning, CategoryQualityWarningReason } from './sections/notices/quality_warnings';

export const useLogEntryCategoriesQuality = ({ jobSummaries }: { jobSummaries: JobSummary[] }) => {
  const categoryQualityWarnings: QualityWarning[] = jobSummaries
    .filter(jobSummary => jobSummary.fullJob?.model_size_stats?.categorization_status === 'warn')
    .map(jobSummary => ({
      type: 'categoryQualityWarning',
      jobId: jobSummary.id,
      reasons: jobSummary.fullJob?.model_size_stats
        ? getCategoryQualityWarningReasons(jobSummary.fullJob.model_size_stats)
        : [],
    }));

  return {
    categoryQualityWarnings,
  };
};

const getCategoryQualityWarningReasons = (
  jobModelSizeStats: JobModelSizeStats
): CategoryQualityWarningReason[] => {
  const rareCategoriesRatio =
    jobModelSizeStats.rare_category_count / jobModelSizeStats.total_category_count;
  const categoriesDocumentRatio =
    jobModelSizeStats.total_category_count / jobModelSizeStats.categorized_doc_count;

  return [
    ...(jobModelSizeStats.total_category_count === 1
      ? [
          {
            type: 'singleCategory' as const,
          },
        ]
      : []),
    ...(rareCategoriesRatio >= 0.9
      ? [
          {
            type: 'manyRareCategories' as const,
            rareCategoriesRatio,
          },
        ]
      : []),
    ...(categoriesDocumentRatio >= 0.5
      ? [
          {
            type: 'manyCategories' as const,
            categoriesDocumentRatio,
          },
        ]
      : []),
  ];
};
