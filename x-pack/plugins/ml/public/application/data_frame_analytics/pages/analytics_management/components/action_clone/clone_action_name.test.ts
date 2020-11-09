/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isAdvancedConfig } from './clone_action_name';

describe('Analytics job clone action', () => {
  describe('isAdvancedConfig', () => {
    test('should detect a classification job created with the form', () => {
      const formCreatedClassificationJob = {
        description: "Classification job with 'bank-marketing' dataset",
        source: {
          index: ['bank-marketing'],
          query: {
            match_all: {},
          },
        },
        dest: {
          index: 'dest_bank_1',
          results_field: 'ml',
        },
        analysis: {
          classification: {
            dependent_variable: 'y',
            num_top_classes: 2,
            num_top_feature_importance_values: 4,
            prediction_field_name: 'y_prediction',
            training_percent: 2,
            randomize_seed: 6233212276062807000,
          },
        },
        analyzed_fields: {
          includes: [],
          excludes: [],
        },
        model_memory_limit: '350mb',
        allow_lazy_start: false,
      };

      expect(isAdvancedConfig(formCreatedClassificationJob)).toBe(false);
    });

    test('should detect a outlier_detection job created with the form', () => {
      const formCreatedOutlierDetectionJob = {
        description: "Outlier detection job with 'glass' dataset",
        source: {
          index: ['glass_withoutdupl_norm'],
          query: {
            match_all: {},
          },
        },
        dest: {
          index: 'dest_glass_1',
          results_field: 'ml',
        },
        analysis: {
          outlier_detection: {
            compute_feature_influence: true,
            outlier_fraction: 0.05,
            standardization_enabled: true,
          },
        },
        analyzed_fields: {
          includes: [],
          excludes: [],
        },
        model_memory_limit: '1mb',
        allow_lazy_start: false,
      };
      expect(isAdvancedConfig(formCreatedOutlierDetectionJob)).toBe(false);
    });

    test('should detect a regression job created with the form', () => {
      const formCreatedRegressionJob = {
        description: "Regression job with 'electrical-grid-stability' dataset",
        source: {
          index: ['electrical-grid-stability'],
          query: {
            match_all: {},
          },
        },
        dest: {
          index: 'dest_grid_1',
          results_field: 'ml',
        },
        analysis: {
          regression: {
            dependent_variable: 'stab',
            prediction_field_name: 'stab_prediction',
            training_percent: 20,
            randomize_seed: -2228827740028660200,
            num_top_feature_importance_values: 4,
            loss_function: 'mse',
          },
        },
        analyzed_fields: {
          includes: ['included_field', 'other_included_field'],
          excludes: [],
        },
        model_memory_limit: '150mb',
        allow_lazy_start: false,
      };

      expect(isAdvancedConfig(formCreatedRegressionJob)).toBe(false);
    });

    test('should detect advanced classification job', () => {
      const advancedClassificationJob = {
        description: "Classification job with 'bank-marketing' dataset",
        source: {
          index: ['bank-marketing'],
          query: {
            match_all: {},
          },
        },
        dest: {
          index: 'dest_bank_1',
          results_field: 'CUSTOM_RESULT_FIELD',
        },
        analysis: {
          classification: {
            dependent_variable: 'y',
            num_top_classes: 2,
            num_top_feature_importance_values: 4,
            prediction_field_name: 'y_prediction',
            training_percent: 2,
            randomize_seed: 6233212276062807000,
          },
        },
        analyzed_fields: {
          includes: [],
          excludes: ['excluded_field'],
        },
        model_memory_limit: '350mb',
        allow_lazy_start: false,
      };

      expect(isAdvancedConfig(advancedClassificationJob)).toBe(true);
    });

    test('should detect advanced classification job with excludes set', () => {
      const advancedClassificationJob = {
        description: "Classification job with 'bank-marketing' dataset",
        source: {
          index: ['bank-marketing'],
          query: {
            match_all: {},
          },
        },
        dest: {
          index: 'dest_bank_1',
          results_field: 'ml',
        },
        analysis: {
          classification: {
            dependent_variable: 'y',
            num_top_classes: 2,
            num_top_feature_importance_values: 4,
            prediction_field_name: 'y_prediction',
            training_percent: 2,
            randomize_seed: 6233212276062807000,
          },
        },
        analyzed_fields: {
          includes: [],
          excludes: ['excluded_field', 'other_excluded_field'],
        },
        model_memory_limit: '350mb',
        allow_lazy_start: false,
      };

      expect(isAdvancedConfig(advancedClassificationJob)).toBe(true);
    });

    test('should detect advanced regression job', () => {
      const advancedRegressionJob = {
        description: "Outlier detection job with 'glass' dataset",
        source: {
          index: ['glass_withoutdupl_norm'],
          query: {
            // TODO check default for `match`
            match_all: {},
          },
        },
        dest: {
          index: 'dest_glass_1',
          results_field: 'ml',
        },
        analysis: {
          regression: {
            loss_function: 'msle',
          },
        },
        analyzed_fields: {
          includes: [],
          excludes: [],
        },
        model_memory_limit: '1mb',
        allow_lazy_start: false,
      };
      expect(isAdvancedConfig(advancedRegressionJob)).toBe(true);
    });

    test('should detect a custom query', () => {
      const advancedRegressionJob = {
        description: "Regression job with 'electrical-grid-stability' dataset",
        source: {
          index: ['electrical-grid-stability'],
          query: {
            match: {
              custom_field: 'custom_match',
            },
          },
        },
        dest: {
          index: 'dest_grid_1',
          results_field: 'ml',
        },
        analysis: {
          regression: {
            dependent_variable: 'stab',
            prediction_field_name: 'stab_prediction',
            training_percent: 20,
            randomize_seed: -2228827740028660200,
            num_top_feature_importance_values: 4,
            loss_function: 'mse',
          },
        },
        analyzed_fields: {
          includes: [],
          excludes: [],
        },
        model_memory_limit: '150mb',
        allow_lazy_start: false,
      };

      expect(isAdvancedConfig(advancedRegressionJob)).toBe(true);
    });

    test('should detect as advanced if the prop is unknown', () => {
      const config = {
        description: "Classification clone with 'bank-marketing' dataset",
        source: {
          index: 'bank-marketing',
        },
        dest: {
          index: 'bank_classification4',
        },
        analyzed_fields: {
          excludes: [],
        },
        analysis: {
          classification: {
            dependent_variable: 'y',
            training_percent: 71,
            maximum_number_trees: 1500,
            num_top_feature_importance_values: 4,
          },
        },
        model_memory_limit: '400mb',
      };

      expect(isAdvancedConfig(config)).toBe(true);
    });
  });
});
