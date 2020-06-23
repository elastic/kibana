/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo } from 'react';

import { JobModelSizeStats, JobSummary } from '../../../containers/logs/log_analysis';
import { QualityWarning, CategoryQualityWarningReason } from './sections/notices/quality_warnings';

export const useLogEntryCategoriesQuality = ({ jobSummaries }: { jobSummaries: JobSummary[] }) => {
  const categoryQualityWarnings: QualityWarning[] = useMemo(
    () =>
      jobSummaries
        .filter(
          (jobSummary) => jobSummary.fullJob?.model_size_stats?.categorization_status === 'warn'
        )
        .map((jobSummary) => ({
          type: 'categoryQualityWarning',
          jobId: jobSummary.id,
          reasons: jobSummary.fullJob?.model_size_stats
            ? getCategoryQualityWarningReasons(jobSummary.fullJob.model_size_stats)
            : [],
        })),
    [jobSummaries]
  );

  return {
    categoryQualityWarnings,
  };
};

const getCategoryQualityWarningReasons = ({
  categorized_doc_count: categorizedDocCount,
  dead_category_count: deadCategoryCount,
  frequent_category_count: frequentCategoryCount,
  rare_category_count: rareCategoryCount,
  total_category_count: totalCategoryCount,
}: JobModelSizeStats): CategoryQualityWarningReason[] => {
  const rareCategoriesRatio = rareCategoryCount / totalCategoryCount;
  const categoriesDocumentRatio = totalCategoryCount / categorizedDocCount;
  const deadCategoriesRatio = deadCategoryCount / totalCategoryCount;

  return [
    ...(totalCategoryCount === 1
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
    ...(categorizedDocCount > 100 && categoriesDocumentRatio >= 0.5
      ? [
          {
            type: 'manyCategories' as const,
            categoriesDocumentRatio,
          },
        ]
      : []),
    ...(frequentCategoryCount === 0
      ? [
          {
            type: 'noFrequentCategories' as const,
          },
        ]
      : []),
    ...(deadCategoriesRatio >= 0.5
      ? [
          {
            type: 'manyDeadCategories' as const,
            deadCategoriesRatio,
          },
        ]
      : []),
  ];
};
