/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Service for obtaining data for the ML Results dashboards.

import chrome from 'ui/chrome';

import { http } from 'plugins/ml/services/http_service';

const basePath = chrome.addBasePath('/api/ml');

export const results = {
  getAnomaliesTableData(
    jobIds,
    criteriaFields,
    influencers,
    aggregationInterval,
    threshold,
    earliestMs,
    latestMs,
    maxRecords,
    maxExamples) {

    return http({
      url: `${basePath}/results/anomalies_table_data`,
      method: 'POST',
      data: {
        jobIds,
        criteriaFields,
        influencers,
        aggregationInterval,
        threshold,
        earliestMs,
        latestMs,
        maxRecords,
        maxExamples
      }
    });
  },

  getCategoryDefinition(jobId, categoryId) {
    return http({
      url: `${basePath}/results/category_definition`,
      method: 'POST',
      data: { jobId, categoryId }
    });
  },

  getCategoryExamples(
    jobId,
    categoryIds,
    maxExamples
  ) {

    return http({
      url: `${basePath}/results/category_examples`,
      method: 'POST',
      data: {
        jobId,
        categoryIds,
        maxExamples
      }
    });
  }
};
