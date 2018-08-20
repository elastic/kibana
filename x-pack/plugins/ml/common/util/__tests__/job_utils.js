/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import expect from 'expect.js';
import {
  calculateDatafeedFrequencyDefaultSeconds,
  isTimeSeriesViewJob,
  isTimeSeriesViewDetector,
  isTimeSeriesViewFunction,
  isModelPlotEnabled,
  isJobVersionGte,
  mlFunctionToESAggregation,
  isJobIdValid,
  ML_MEDIAN_PERCENTS,
  prefixDatafeedId,
  getSafeAggregationName
} from '../job_utils';

describe('ML - job utils', () => {
  describe('calculateDatafeedFrequencyDefaultSeconds', () => {

    it('returns correct frequency for 119', () => {
      const result = calculateDatafeedFrequencyDefaultSeconds(119);
      expect(result).to.be(60);
    });
    it('returns correct frequency for 120', () => {
      const result = calculateDatafeedFrequencyDefaultSeconds(120);
      expect(result).to.be(60);
    });
    it('returns correct frequency for 300', () => {
      const result = calculateDatafeedFrequencyDefaultSeconds(300);
      expect(result).to.be(150);
    });
    it('returns correct frequency for 601', () => {
      const result = calculateDatafeedFrequencyDefaultSeconds(601);
      expect(result).to.be(300);
    });
    it('returns correct frequency for 43200', () => {
      const result = calculateDatafeedFrequencyDefaultSeconds(43200);
      expect(result).to.be(600);
    });
    it('returns correct frequency for 43201', () => {
      const result = calculateDatafeedFrequencyDefaultSeconds(43201);
      expect(result).to.be(3600);
    });

  });

  describe('isTimeSeriesViewJob', () => {

    it('returns true when job has a single detector with a metric function', () => {
      const job = {
        analysis_config: {
          detectors: [
            { 'function': 'high_count', 'partition_field_name': 'status', 'detector_description': 'High count status code' }
          ]
        }
      };

      expect(isTimeSeriesViewJob(job)).to.be(true);
    });

    it('returns true when job has at least one detector with a metric function', () => {
      const job = {
        analysis_config: {
          detectors: [
            { 'function': 'high_count', 'partition_field_name': 'status', 'detector_description': 'High count status code' },
            { 'function': 'rare', 'by_field_name': 'status', 'over_field_name': 'clientip', 'detector_description': 'Rare status code' }
          ]
        }
      };

      expect(isTimeSeriesViewJob(job)).to.be(true);
    });

    it('returns false when job does not have at least one detector with a metric function', () => {
      const job = {
        analysis_config: {
          detectors: [
            { 'function': 'rare', 'by_field_name': 'status', 'over_field_name': 'clientip', 'detector_description': 'Rare status code' },
            { 'function': 'freq_rare', 'by_field_name': 'uri', 'over_field_name': 'clientip', 'detector_description': 'Freq rare URI' }
          ]
        }
      };

      expect(isTimeSeriesViewJob(job)).to.be(false);
    });

    it('returns false when job has a single count by category detector', () => {
      const job = {
        analysis_config: {
          detectors: [
            { 'function': 'count', 'by_field_name': 'mlcategory', 'detector_description': 'Count by category' }
          ]
        }
      };

      expect(isTimeSeriesViewJob(job)).to.be(false);
    });

  });

  describe('isTimeSeriesViewDetector', () => {

    const job = {
      analysis_config: {
        detectors: [
          { 'function': 'sum', 'field_name': 'bytes', 'partition_field_name': 'clientip', 'detector_description': 'High bytes client IP' }, // eslint-disable-line max-len
          { 'function': 'freq_rare', 'by_field_name': 'uri', 'over_field_name': 'clientip', 'detector_description': 'Freq rare URI' },
          { 'function': 'count', 'by_field_name': 'mlcategory', 'detector_description': 'Count by category' },
          { 'function': 'count', 'by_field_name': 'hrd', 'detector_description': 'count by hrd' },
          { 'function': 'mean', 'field_name': 'NetworkDiff', 'detector_description': 'avg NetworkDiff' }
        ]
      },
      datafeed_config: {
        script_fields: {
          'hrd': {
            'script': {
              'inline': 'return domainSplit(doc["query"].value, params).get(1);',
              'lang': 'painless'
            }
          },
          'NetworkDiff': {
            'script': {
              'source': 'doc["NetworkOut"].value - doc["NetworkIn"].value',
              'lang': 'painless'
            }
          }
        }
      }
    };

    it('returns true for a detector with a metric function', () => {
      expect(isTimeSeriesViewDetector(job, 0)).to.be(true);
    });

    it('returns false for a detector with a non-metric function', () => {
      expect(isTimeSeriesViewDetector(job, 1)).to.be(false);
    });

    it('returns false for a detector using count on an mlcategory field', () => {
      expect(isTimeSeriesViewDetector(job, 2)).to.be(false);
    });

    it('returns false for a detector using a script field as a by field', () => {
      expect(isTimeSeriesViewDetector(job, 3)).to.be(false);
    });

    it('returns false for a detector using a script field as a metric field_name', () => {
      expect(isTimeSeriesViewDetector(job, 4)).to.be(false);
    });

  });

  describe('isTimeSeriesViewFunction', () => {

    it('returns true for expected functions', () => {
      expect(isTimeSeriesViewFunction('count')).to.be(true);
      expect(isTimeSeriesViewFunction('low_count')).to.be(true);
      expect(isTimeSeriesViewFunction('high_count')).to.be(true);
      expect(isTimeSeriesViewFunction('non_zero_count')).to.be(true);
      expect(isTimeSeriesViewFunction('low_non_zero_count')).to.be(true);
      expect(isTimeSeriesViewFunction('high_non_zero_count')).to.be(true);
      expect(isTimeSeriesViewFunction('distinct_count')).to.be(true);
      expect(isTimeSeriesViewFunction('low_distinct_count')).to.be(true);
      expect(isTimeSeriesViewFunction('high_distinct_count')).to.be(true);
      expect(isTimeSeriesViewFunction('metric')).to.be(true);
      expect(isTimeSeriesViewFunction('mean')).to.be(true);
      expect(isTimeSeriesViewFunction('low_mean')).to.be(true);
      expect(isTimeSeriesViewFunction('high_mean')).to.be(true);
      expect(isTimeSeriesViewFunction('median')).to.be(true);
      expect(isTimeSeriesViewFunction('low_median')).to.be(true);
      expect(isTimeSeriesViewFunction('high_median')).to.be(true);
      expect(isTimeSeriesViewFunction('min')).to.be(true);
      expect(isTimeSeriesViewFunction('max')).to.be(true);
      expect(isTimeSeriesViewFunction('sum')).to.be(true);
      expect(isTimeSeriesViewFunction('low_sum')).to.be(true);
      expect(isTimeSeriesViewFunction('high_sum')).to.be(true);
      expect(isTimeSeriesViewFunction('non_null_sum')).to.be(true);
      expect(isTimeSeriesViewFunction('low_non_null_sum')).to.be(true);
      expect(isTimeSeriesViewFunction('high_non_null_sum')).to.be(true);
    });

    it('returns false for expected functions', () => {
      expect(isTimeSeriesViewFunction('rare')).to.be(false);
      expect(isTimeSeriesViewFunction('freq_rare')).to.be(false);
      expect(isTimeSeriesViewFunction('info_content')).to.be(false);
      expect(isTimeSeriesViewFunction('low_info_content')).to.be(false);
      expect(isTimeSeriesViewFunction('high_info_content')).to.be(false);
      expect(isTimeSeriesViewFunction('varp')).to.be(false);
      expect(isTimeSeriesViewFunction('low_varp')).to.be(false);
      expect(isTimeSeriesViewFunction('high_varp')).to.be(false);
      expect(isTimeSeriesViewFunction('time_of_day')).to.be(false);
      expect(isTimeSeriesViewFunction('time_of_week')).to.be(false);
      expect(isTimeSeriesViewFunction('lat_long')).to.be(false);
    });
  });

  describe('isModelPlotEnabled', () => {

    it('returns true for a job in which model plot has been enabled', () => {
      const job = {
        analysis_config: {
          detectors: [
            { 'function': 'high_count', 'partition_field_name': 'status', 'detector_description': 'High count status code' }
          ]
        },
        model_plot_config: {
          enabled: true
        }
      };

      expect(isModelPlotEnabled(job, 0)).to.be(true);
    });

    it('returns expected values for a job in which model plot has been enabled with terms', () => {
      const job = {
        analysis_config: {
          detectors: [
            { 'function': 'max',
              'field_name': 'responsetime',
              'partition_field_name': 'country',
              'by_field_name': 'airline' }
          ]
        },
        model_plot_config: {
          enabled: true,
          terms: 'US,AAL'
        }
      };

      expect(isModelPlotEnabled(job, 0, [
        { fieldName: 'country', fieldValue: 'US' },
        { fieldName: 'airline', fieldValue: 'AAL' }
      ])).to.be(true);
      expect(isModelPlotEnabled(job, 0, [
        { fieldName: 'country', fieldValue: 'US' }
      ])).to.be(false);
      expect(isModelPlotEnabled(job, 0, [
        { fieldName: 'country', fieldValue: 'GB' },
        { fieldName: 'airline', fieldValue: 'AAL' }
      ])).to.be(false);
      expect(isModelPlotEnabled(job, 0, [
        { fieldName: 'country', fieldValue: 'JP' },
        { fieldName: 'airline', fieldValue: 'JAL' }
      ])).to.be(false);
    });

    it('returns true for jobs in which model plot has not been enabled', () => {
      const job1 = {
        analysis_config: {
          detectors: [
            { 'function': 'high_count', 'partition_field_name': 'status', 'detector_description': 'High count status code' }
          ]
        },
        model_plot_config: {
          enabled: false
        }
      };
      const job2 = {};

      expect(isModelPlotEnabled(job1, 0)).to.be(false);
      expect(isModelPlotEnabled(job2, 0)).to.be(false);
    });

  });

  describe('isJobVersionGte', () => {

    const job = {
      job_version: '6.1.1'
    };

    it('returns true for later job version', () => {
      expect(isJobVersionGte(job, '6.1.0')).to.be(true);
    });
    it('returns true for equal job version', () => {
      expect(isJobVersionGte(job, '6.1.1')).to.be(true);
    });
    it('returns false for earlier job version', () => {
      expect(isJobVersionGte(job, '6.1.2')).to.be(false);
    });
  });

  describe('mlFunctionToESAggregation', () => {
    it('returns correct ES aggregation type for ML function', () => {
      expect(mlFunctionToESAggregation('count')).to.be('count');
      expect(mlFunctionToESAggregation('low_count')).to.be('count');
      expect(mlFunctionToESAggregation('high_count')).to.be('count');
      expect(mlFunctionToESAggregation('non_zero_count')).to.be('count');
      expect(mlFunctionToESAggregation('low_non_zero_count')).to.be('count');
      expect(mlFunctionToESAggregation('high_non_zero_count')).to.be('count');
      expect(mlFunctionToESAggregation('distinct_count')).to.be('cardinality');
      expect(mlFunctionToESAggregation('low_distinct_count')).to.be('cardinality');
      expect(mlFunctionToESAggregation('high_distinct_count')).to.be('cardinality');
      expect(mlFunctionToESAggregation('metric')).to.be('avg');
      expect(mlFunctionToESAggregation('mean')).to.be('avg');
      expect(mlFunctionToESAggregation('low_mean')).to.be('avg');
      expect(mlFunctionToESAggregation('high_mean')).to.be('avg');
      expect(mlFunctionToESAggregation('min')).to.be('min');
      expect(mlFunctionToESAggregation('max')).to.be('max');
      expect(mlFunctionToESAggregation('sum')).to.be('sum');
      expect(mlFunctionToESAggregation('low_sum')).to.be('sum');
      expect(mlFunctionToESAggregation('high_sum')).to.be('sum');
      expect(mlFunctionToESAggregation('non_null_sum')).to.be('sum');
      expect(mlFunctionToESAggregation('low_non_null_sum')).to.be('sum');
      expect(mlFunctionToESAggregation('high_non_null_sum')).to.be('sum');
      expect(mlFunctionToESAggregation('rare')).to.be(null);
      expect(mlFunctionToESAggregation('freq_rare')).to.be(null);
      expect(mlFunctionToESAggregation('info_content')).to.be(null);
      expect(mlFunctionToESAggregation('low_info_content')).to.be(null);
      expect(mlFunctionToESAggregation('high_info_content')).to.be(null);
      expect(mlFunctionToESAggregation('median')).to.be('percentiles');
      expect(mlFunctionToESAggregation('low_median')).to.be('percentiles');
      expect(mlFunctionToESAggregation('high_median')).to.be('percentiles');
      expect(mlFunctionToESAggregation('varp')).to.be(null);
      expect(mlFunctionToESAggregation('low_varp')).to.be(null);
      expect(mlFunctionToESAggregation('high_varp')).to.be(null);
      expect(mlFunctionToESAggregation('time_of_day')).to.be(null);
      expect(mlFunctionToESAggregation('time_of_week')).to.be(null);
      expect(mlFunctionToESAggregation('lat_long')).to.be(null);
    });
  });

  describe('isJobIdValid', () => {

    it('returns true for job id: "good_job-name"', () => {
      expect(isJobIdValid('good_job-name')).to.be(true);
    });
    it('returns false for job id: "_bad_job-name"', () => {
      expect(isJobIdValid('_bad_job-name')).to.be(false);
    });
    it('returns false for job id: "bad_job-name_"', () => {
      expect(isJobIdValid('bad_job-name_')).to.be(false);
    });
    it('returns false for job id: "-bad_job-name"', () => {
      expect(isJobIdValid('-bad_job-name')).to.be(false);
    });
    it('returns false for job id: "bad_job-name-"', () => {
      expect(isJobIdValid('bad_job-name-')).to.be(false);
    });
    it('returns false for job id: "bad&job-name"', () => {
      expect(isJobIdValid('bad&job-name')).to.be(false);
    });
  });

  describe('ML_MEDIAN_PERCENTS', () => {

    it('is \'50.0\'', () => {
      expect(ML_MEDIAN_PERCENTS).to.be('50.0');
    });
  });

  describe('prefixDatafeedId', () => {

    it('returns datafeed-prefix-job"', () => {
      expect(prefixDatafeedId('datafeed-job', 'prefix-')).to.be('datafeed-prefix-job');
    });

    it('returns prefix-job"', () => {
      expect(prefixDatafeedId('job', 'prefix-')).to.be('prefix-job');
    });
  });

  describe('getSafeAggregationName', () => {
    it('"foo" should be "foo"', () => {
      expect(getSafeAggregationName('foo', 0)).to.be('foo');
    });
    it('"foo.bar" should be "foo.bar"', () => {
      expect(getSafeAggregationName('foo.bar', 0)).to.be('foo.bar');
    });
    it('"foo&bar" should be "field_0"', () => {
      expect(getSafeAggregationName('foo&bar', 0)).to.be('field_0');
    });

  });
});
