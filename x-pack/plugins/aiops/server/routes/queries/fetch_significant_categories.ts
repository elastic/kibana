/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { criticalTableLookup, type Histogram } from '@kbn/ml-chi2test';
import { type SignificantTerm, SIGNIFICANT_TERM_TYPE } from '@kbn/ml-agg-utils';

import type { Category } from '../../../common/api/log_categorization/types';
import type { AiopsLogRateAnalysisSchema } from '../../../common/api/log_rate_analysis';
import { LOG_RATE_ANALYSIS_P_VALUE_THRESHOLD } from '../../../common/constants';

import { fetchCategories } from './fetch_categories';
import { getNormalizedScore } from './get_normalized_score';

const getCategoriesTestData = (categories: Category[]): Histogram[] => {
  const categoriesBaselineTotalCount = getCategoriesTotalCount(categories);
  return categories.map((d) => ({
    key: d.key,
    doc_count: d.count,
    percentage: d.count / categoriesBaselineTotalCount,
  }));
};

const getCategoriesTotalCount = (categories: Category[]): number =>
  categories.reduce((p, c) => p + c.count, 0);

export const fetchSignificantCategories = async (
  esClient: ElasticsearchClient,
  params: AiopsLogRateAnalysisSchema,
  fieldNames: string[],
  logger: Logger,
  // The default value of 1 means no sampling will be used
  sampleProbability: number = 1,
  emitError: (m: string) => void,
  abortSignal?: AbortSignal
) => {
  // To make sure we have the same categories for both baseline and deviation,
  // we do an initial query that spans across baseline start and deviation end.
  // We could update this to query the exact baseline AND deviation range, but
  // wanted to avoid the refactor here and it should be good enough for a start.
  const categoriesOverall = await fetchCategories(
    esClient,
    params,
    fieldNames,
    params.baselineMin,
    params.deviationMax,
    logger,
    sampleProbability,
    emitError,
    abortSignal
  );

  const categoriesBaseline = await fetchCategories(
    esClient,
    params,
    fieldNames,
    params.baselineMin,
    params.baselineMax,
    logger,
    sampleProbability,
    emitError,
    abortSignal
  );

  const categoriesDeviation = await fetchCategories(
    esClient,
    params,
    fieldNames,
    params.deviationMin,
    params.deviationMax,
    logger,
    sampleProbability,
    emitError,
    abortSignal
  );

  if (
    categoriesBaseline.length !== fieldNames.length ||
    categoriesDeviation.length !== fieldNames.length
  )
    return [];

  const significantCategories: SignificantTerm[] = [];

  fieldNames.forEach((fieldName, i) => {
    const categoriesBaselineTotalCount = getCategoriesTotalCount(categoriesBaseline[i].categories);
    const categoriesBaselineTestData = getCategoriesTestData(categoriesBaseline[i].categories);

    const categoriesDeviationTotalCount = getCategoriesTotalCount(
      categoriesDeviation[i].categories
    );
    const categoriesDeviationTestData = getCategoriesTestData(categoriesDeviation[i].categories);

    // Get all unique keys from both arrays
    const allKeys: string[] = Array.from(
      new Set([
        ...categoriesBaselineTestData.map((term) => term.key.toString()),
        ...categoriesDeviationTestData.map((term) => term.key.toString()),
      ])
    ).slice(0, 100);

    allKeys.forEach((key) => {
      const categoryData = categoriesOverall[i].categories.find((c) => c.key === key);

      const baselineTerm = categoriesBaselineTestData.find((term) => term.key === key);
      const deviationTerm = categoriesDeviationTestData.find((term) => term.key === key);

      const observed: number = deviationTerm?.percentage ?? 0;
      const expected: number = baselineTerm?.percentage ?? 0;
      const chiSquared = Math.pow(observed - expected, 2) / (expected > 0 ? expected : 1e-6); // Prevent divide by zero

      const pValue = criticalTableLookup(chiSquared, 1);
      const score = Math.log(pValue);

      if (pValue <= LOG_RATE_ANALYSIS_P_VALUE_THRESHOLD && observed > expected) {
        significantCategories.push({
          key,
          fieldName,
          fieldValue: categoryData?.examples[0] ?? '',
          doc_count: deviationTerm?.doc_count ?? 0,
          bg_count: baselineTerm?.doc_count ?? 0,
          total_doc_count: categoriesDeviationTotalCount,
          total_bg_count: categoriesBaselineTotalCount,
          score,
          pValue,
          normalizedScore: getNormalizedScore(score),
          type: SIGNIFICANT_TERM_TYPE.LOG_PATTERN,
        });
      }
    });
  });

  return significantCategories;
};
