/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Service for obtaining data for the ML Results dashboards.

import { pick } from 'lodash';
import chrome from 'ui/chrome';

import { http } from 'plugins/ml/services/http_service';

const basePath = chrome.addBasePath('/api/ml');

export const results = {
  getAnomaliesTableData(obj) {
    const data = pick(obj, [
      'jobIds',
      'influencers',
      'aggregationInterval',
      'threshold',
      'earliestMs',
      'latestMs',
      'maxRecords',
      'maxExamples'
    ]);

    return http({
      url: `${basePath}/results/anomalies_table_data`,
      method: 'POST',
      data
    });
  },

  getCategoryDefinition(obj) {
    const data = pick(obj, [
      'jobId',
      'categoryId'
    ]);

    return http({
      url: `${basePath}/results/category_definition`,
      method: 'POST',
      data
    });
  },

  getCategoryExamples(obj) {
    const data = pick(obj, [
      'jobId',
      'categoryIds',
      'maxExamples'
    ]);

    return http({
      url: `${basePath}/results/category_examples`,
      method: 'POST',
      data
    });
  }
};
