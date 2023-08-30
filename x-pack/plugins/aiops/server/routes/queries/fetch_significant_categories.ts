/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { criticalTableLookup, type Histogram } from '@kbn/ml-chi2test';
import type { SignificantTerm } from '@kbn/ml-agg-utils';

import { fetchCategories } from './fetch_categories';

import type { AiopsLogRateAnalysisSchema } from '../../../common/api/log_rate_analysis';
import { LOG_RATE_ANALYSIS_P_VALUE_THRESHOLD } from '../../../common/constants';

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

  const categoriesBaselineTotalCount = categoriesBaseline[0].categories.reduce(
    (p, c) => p + c.count,
    0
  );
  const categoriesBaselineTestData: Histogram[] = categoriesBaseline[0].categories.map((d) => ({
    key: d.key,
    doc_count: d.count,
    percentage: d.count / categoriesBaselineTotalCount,
  }));

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

  const categoriesDeviationTotalCount = categoriesDeviation[0].categories.reduce(
    (p, c) => p + c.count,
    0
  );
  const categoriesDeviationTestData: Histogram[] = categoriesDeviation[0].categories.map((d) => ({
    key: d.key,
    doc_count: d.count,
    percentage: d.count / categoriesDeviationTotalCount,
  }));

  // console.log(
  //   'totals',
  //   categoriesBaselineTotalCount,
  //   categoriesDeviationTotalCount
  // );

  // Get all unique keys from both arrays
  const allKeys: string[] = Array.from(
    new Set([
      ...categoriesBaselineTestData.map((term) => term.key.toString()),
      ...categoriesDeviationTestData.map((term) => term.key.toString()),
    ])
  ).slice(0, 100);

  const significantCategories: SignificantTerm[] = [];

  allKeys.forEach((key) => {
    const baselineTerm = categoriesBaselineTestData.find((term) => term.key === key);
    const deviationTerm = categoriesDeviationTestData.find((term) => term.key === key);

    const observed: number = deviationTerm?.percentage ?? 0;
    const expected: number = baselineTerm?.percentage ?? 0;
    const chiSquared = Math.pow(observed - expected, 2) / (expected > 0 ? expected : 1e-6); // Prevent divide by zero

    const pValue = criticalTableLookup(chiSquared, 1);

    if (pValue <= LOG_RATE_ANALYSIS_P_VALUE_THRESHOLD && observed > expected) {
      significantCategories.push({
        fieldName: 'message',
        fieldValue: key,
        doc_count: deviationTerm?.doc_count ?? 0,
        bg_count: baselineTerm?.doc_count ?? 0,
        total_doc_count: categoriesDeviationTotalCount,
        total_bg_count: categoriesBaselineTotalCount,
        score: 0,
        pValue,
        normalizedScore: 0,
      });
    }
  });

  return significantCategories;
};
