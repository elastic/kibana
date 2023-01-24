/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataFrameAnalyticsConfig } from '../../../../common';

import { getFeatureCount, getOutlierScoreFieldName } from './common';

describe('Data Frame Analytics: <Exploration /> common utils', () => {
  describe('getOutlierScoreFieldName()', () => {
    it('returns the outlier_score field name based on the job config.', () => {
      const jobConfig: DataFrameAnalyticsConfig = {
        id: 'the-id',
        analysis: { outlier_detection: {} },
        dest: {
          index: 'the-dest-index',
          results_field: 'the-results-field',
        },
        source: {
          index: 'the-source-index',
        },
        analyzed_fields: { includes: [], excludes: [] },
        model_memory_limit: '50mb',
        create_time: 1234,
        version: '1.0.0',
      };

      const outlierScoreFieldName = getOutlierScoreFieldName(jobConfig);

      expect(outlierScoreFieldName).toMatch('the-results-field.outlier_score');
    });
  });

  describe('getFeatureCount()', () => {
    it('returns 0 features with no table items.', () => {
      expect(getFeatureCount('ml')).toBe(0);
    });
    it('returns 0 features with table items with no feature influencer info', () => {
      expect(getFeatureCount('ml', [{}])).toBe(0);
    });
    it('returns number of features with table items with feature influencer info', () => {
      expect(
        getFeatureCount('ml', [
          {
            'ml.feature_influence': [
              { feature_name: ['the-feature-name-1'], influence: [0.1] },
              { feature_name: ['the-feature-name-2'], influence: [0.2] },
            ],
          },
        ])
      ).toBe(2);
    });
  });
});
