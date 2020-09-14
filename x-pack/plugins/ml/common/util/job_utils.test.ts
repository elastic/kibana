/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  calculateDatafeedFrequencyDefaultSeconds,
  isTimeSeriesViewJob,
  isTimeSeriesViewDetector,
  isSourceDataChartableForDetector,
  isModelPlotChartableForDetector,
  getPartitioningFieldNames,
  isModelPlotEnabled,
  isJobVersionGte,
  mlFunctionToESAggregation,
  isJobIdValid,
  prefixDatafeedId,
  getSafeAggregationName,
  getLatestDataOrBucketTimestamp,
  getEarliestDatafeedStartTime,
} from './job_utils';
import { CombinedJob, Job } from '../types/anomaly_detection_jobs';
import moment from 'moment';

describe('ML - job utils', () => {
  describe('calculateDatafeedFrequencyDefaultSeconds', () => {
    test('returns correct frequency for 119', () => {
      const result = calculateDatafeedFrequencyDefaultSeconds(119);
      expect(result).toBe(60);
    });
    test('returns correct frequency for 120', () => {
      const result = calculateDatafeedFrequencyDefaultSeconds(120);
      expect(result).toBe(60);
    });
    test('returns correct frequency for 300', () => {
      const result = calculateDatafeedFrequencyDefaultSeconds(300);
      expect(result).toBe(150);
    });
    test('returns correct frequency for 601', () => {
      const result = calculateDatafeedFrequencyDefaultSeconds(601);
      expect(result).toBe(300);
    });
    test('returns correct frequency for 43200', () => {
      const result = calculateDatafeedFrequencyDefaultSeconds(43200);
      expect(result).toBe(600);
    });
    test('returns correct frequency for 43201', () => {
      const result = calculateDatafeedFrequencyDefaultSeconds(43201);
      expect(result).toBe(3600);
    });
  });

  describe('isTimeSeriesViewJob', () => {
    test('returns true when job has a single detector with a metric function', () => {
      const job = ({
        analysis_config: {
          detectors: [
            {
              function: 'high_count',
              partition_field_name: 'status',
              detector_description: 'High count status code',
            },
          ],
        },
      } as unknown) as CombinedJob;

      expect(isTimeSeriesViewJob(job)).toBe(true);
    });

    test('returns true when job has at least one detector with a metric function', () => {
      const job = ({
        analysis_config: {
          detectors: [
            {
              function: 'high_count',
              partition_field_name: 'status',
              detector_description: 'High count status code',
            },
            {
              function: 'freq_rare',
              by_field_name: 'uri',
              over_field_name: 'clientip',
              detector_description: 'Freq rare URI',
            },
          ],
        },
      } as unknown) as CombinedJob;

      expect(isTimeSeriesViewJob(job)).toBe(true);
    });

    test('returns false when job does not have at least one detector with a metric function', () => {
      const job = ({
        analysis_config: {
          detectors: [
            {
              function: 'varp',
              by_field_name: 'responsetime',
              detector_description: 'Varp responsetime',
            },
            {
              function: 'freq_rare',
              by_field_name: 'uri',
              over_field_name: 'clientip',
              detector_description: 'Freq rare URI',
            },
          ],
        },
      } as unknown) as CombinedJob;

      expect(isTimeSeriesViewJob(job)).toBe(false);
    });

    test('returns false when job has a single count by category detector', () => {
      const job = ({
        analysis_config: {
          detectors: [
            {
              function: 'count',
              by_field_name: 'mlcategory',
              detector_description: 'Count by category',
            },
          ],
        },
      } as unknown) as CombinedJob;

      expect(isTimeSeriesViewJob(job)).toBe(false);
    });
  });

  describe('isTimeSeriesViewDetector', () => {
    const job = ({
      analysis_config: {
        detectors: [
          {
            function: 'sum',
            field_name: 'bytes',
            partition_field_name: 'clientip',
            detector_description: 'High bytes client IP',
          },
          {
            function: 'freq_rare',
            by_field_name: 'uri',
            over_field_name: 'clientip',
            detector_description: 'Freq rare URI',
          },
          {
            function: 'count',
            by_field_name: 'mlcategory',
            detector_description: 'Count by category',
          },
          { function: 'count', by_field_name: 'hrd', detector_description: 'count by hrd' },
          { function: 'mean', field_name: 'NetworkDiff', detector_description: 'avg NetworkDiff' },
        ],
      },
      datafeed_config: {
        script_fields: {
          hrd: {
            script: {
              inline: 'return domainSplit(doc["query"].value, params).get(1);',
              lang: 'painless',
            },
          },
          NetworkDiff: {
            script: {
              source: 'doc["NetworkOut"].value - doc["NetworkIn"].value',
              lang: 'painless',
            },
          },
        },
      },
    } as unknown) as CombinedJob;

    test('returns true for a detector with a metric function', () => {
      expect(isTimeSeriesViewDetector(job, 0)).toBe(true);
    });

    test('returns false for a detector with a non-metric function', () => {
      expect(isTimeSeriesViewDetector(job, 1)).toBe(false);
    });

    test('returns false for a detector using count on an mlcategory field', () => {
      expect(isTimeSeriesViewDetector(job, 2)).toBe(false);
    });

    test('returns false for a detector using a script field as a by field', () => {
      expect(isTimeSeriesViewDetector(job, 3)).toBe(false);
    });

    test('returns false for a detector using a script field as a metric field_name', () => {
      expect(isTimeSeriesViewDetector(job, 4)).toBe(false);
    });
  });

  describe('isSourceDataChartableForDetector', () => {
    const job = ({
      analysis_config: {
        detectors: [
          { function: 'count' }, // 0
          { function: 'low_count' }, // 1
          { function: 'high_count' }, // 2
          { function: 'non_zero_count' }, // 3
          { function: 'low_non_zero_count' }, // 4
          { function: 'high_non_zero_count' }, // 5
          { function: 'distinct_count' }, // 6
          { function: 'low_distinct_count' }, // 7
          { function: 'high_distinct_count' }, // 8
          { function: 'metric' }, // 9
          { function: 'mean' }, // 10
          { function: 'low_mean' }, // 11
          { function: 'high_mean' }, // 12
          { function: 'median' }, // 13
          { function: 'low_median' }, // 14
          { function: 'high_median' }, // 15
          { function: 'min' }, // 16
          { function: 'max' }, // 17
          { function: 'sum' }, // 18
          { function: 'low_sum' }, // 19
          { function: 'high_sum' }, // 20
          { function: 'non_null_sum' }, // 21
          { function: 'low_non_null_sum' }, // 22
          { function: 'high_non_null_sum' }, // 23
          { function: 'rare' }, // 24
          { function: 'count', by_field_name: 'mlcategory' }, // 25
          { function: 'count', by_field_name: 'hrd' }, // 26
          { function: 'freq_rare' }, // 27
          { function: 'info_content' }, // 28
          { function: 'low_info_content' }, // 29
          { function: 'high_info_content' }, // 30
          { function: 'varp' }, // 31
          { function: 'low_varp' }, // 32
          { function: 'high_varp' }, // 33
          { function: 'time_of_day' }, // 34
          { function: 'time_of_week' }, // 35
          { function: 'lat_long' }, // 36
          { function: 'mean', field_name: 'NetworkDiff' }, // 37
        ],
      },
      datafeed_config: {
        script_fields: {
          hrd: {
            script: {
              inline: 'return domainSplit(doc["query"].value, params).get(1);',
              lang: 'painless',
            },
          },
          NetworkDiff: {
            script: {
              source: 'doc["NetworkOut"].value - doc["NetworkIn"].value',
              lang: 'painless',
            },
          },
        },
      },
    } as unknown) as CombinedJob;

    test('returns true for expected detectors', () => {
      expect(isSourceDataChartableForDetector(job, 0)).toBe(true);
      expect(isSourceDataChartableForDetector(job, 1)).toBe(true);
      expect(isSourceDataChartableForDetector(job, 2)).toBe(true);
      expect(isSourceDataChartableForDetector(job, 3)).toBe(true);
      expect(isSourceDataChartableForDetector(job, 4)).toBe(true);
      expect(isSourceDataChartableForDetector(job, 5)).toBe(true);
      expect(isSourceDataChartableForDetector(job, 6)).toBe(true);
      expect(isSourceDataChartableForDetector(job, 7)).toBe(true);
      expect(isSourceDataChartableForDetector(job, 8)).toBe(true);
      expect(isSourceDataChartableForDetector(job, 9)).toBe(true);
      expect(isSourceDataChartableForDetector(job, 10)).toBe(true);
      expect(isSourceDataChartableForDetector(job, 11)).toBe(true);
      expect(isSourceDataChartableForDetector(job, 12)).toBe(true);
      expect(isSourceDataChartableForDetector(job, 13)).toBe(true);
      expect(isSourceDataChartableForDetector(job, 14)).toBe(true);
      expect(isSourceDataChartableForDetector(job, 15)).toBe(true);
      expect(isSourceDataChartableForDetector(job, 16)).toBe(true);
      expect(isSourceDataChartableForDetector(job, 17)).toBe(true);
      expect(isSourceDataChartableForDetector(job, 18)).toBe(true);
      expect(isSourceDataChartableForDetector(job, 19)).toBe(true);
      expect(isSourceDataChartableForDetector(job, 20)).toBe(true);
      expect(isSourceDataChartableForDetector(job, 21)).toBe(true);
      expect(isSourceDataChartableForDetector(job, 22)).toBe(true);
      expect(isSourceDataChartableForDetector(job, 23)).toBe(true);
      expect(isSourceDataChartableForDetector(job, 24)).toBe(true);
    });

    test('returns false for expected detectors', () => {
      expect(isSourceDataChartableForDetector(job, 25)).toBe(false);
      expect(isSourceDataChartableForDetector(job, 26)).toBe(false);
      expect(isSourceDataChartableForDetector(job, 27)).toBe(false);
      expect(isSourceDataChartableForDetector(job, 28)).toBe(false);
      expect(isSourceDataChartableForDetector(job, 29)).toBe(false);
      expect(isSourceDataChartableForDetector(job, 30)).toBe(false);
      expect(isSourceDataChartableForDetector(job, 31)).toBe(false);
      expect(isSourceDataChartableForDetector(job, 32)).toBe(false);
      expect(isSourceDataChartableForDetector(job, 33)).toBe(false);
      expect(isSourceDataChartableForDetector(job, 34)).toBe(false);
      expect(isSourceDataChartableForDetector(job, 35)).toBe(false);
      expect(isSourceDataChartableForDetector(job, 36)).toBe(false);
      expect(isSourceDataChartableForDetector(job, 37)).toBe(false);
    });
  });

  describe('isModelPlotChartableForDetector', () => {
    const job1 = ({
      analysis_config: {
        detectors: [{ function: 'count' }],
      },
    } as unknown) as Job;

    const job2 = ({
      analysis_config: {
        detectors: [
          { function: 'count' },
          { function: 'info_content' },
          {
            function: 'rare',
            by_field_name: 'mlcategory',
          },
        ],
      },
      model_plot_config: {
        enabled: true,
      },
    } as unknown) as Job;

    test('returns false when model plot is not enabled', () => {
      expect(isModelPlotChartableForDetector(job1, 0)).toBe(false);
    });

    test('returns true for count detector when model plot is enabled', () => {
      expect(isModelPlotChartableForDetector(job2, 0)).toBe(true);
    });

    test('returns true for info_content detector when model plot is enabled', () => {
      expect(isModelPlotChartableForDetector(job2, 1)).toBe(true);
    });

    test('returns false for rare by mlcategory when model plot is enabled', () => {
      expect(isModelPlotChartableForDetector(job2, 2)).toBe(false);
    });
  });

  describe('getPartitioningFieldNames', () => {
    const job = ({
      analysis_config: {
        detectors: [
          {
            function: 'count',
            detector_description: 'count',
          },
          {
            function: 'count',
            partition_field_name: 'clientip',
            detector_description: 'Count by clientip',
          },
          {
            function: 'freq_rare',
            by_field_name: 'uri',
            over_field_name: 'clientip',
            detector_description: 'Freq rare URI',
          },
          {
            function: 'sum',
            field_name: 'bytes',
            by_field_name: 'uri',
            over_field_name: 'clientip',
            partition_field_name: 'method',
            detector_description: 'sum bytes',
          },
        ],
      },
    } as unknown) as CombinedJob;

    test('returns empty array for a detector with no partitioning fields', () => {
      const resp = getPartitioningFieldNames(job, 0);
      expect(resp).toEqual([]);
    });

    test('returns expected array for a detector with a partition field', () => {
      const resp = getPartitioningFieldNames(job, 1);
      expect(resp).toEqual(['clientip']);
    });

    test('returns expected array for a detector with by and over fields', () => {
      const resp = getPartitioningFieldNames(job, 2);
      expect(resp).toEqual(['uri', 'clientip']);
    });

    test('returns expected array for a detector with partition, by and over fields', () => {
      const resp = getPartitioningFieldNames(job, 3);
      expect(resp).toEqual(['method', 'uri', 'clientip']);
    });
  });

  describe('isModelPlotEnabled', () => {
    test('returns true for a job in which model plot has been enabled', () => {
      const job = ({
        analysis_config: {
          detectors: [
            {
              function: 'high_count',
              partition_field_name: 'status',
              detector_description: 'High count status code',
            },
          ],
        },
        model_plot_config: {
          enabled: true,
        },
      } as unknown) as Job;

      expect(isModelPlotEnabled(job, 0)).toBe(true);
    });

    test('returns expected values for a job in which model plot has been enabled with terms', () => {
      const job = ({
        analysis_config: {
          detectors: [
            {
              function: 'max',
              field_name: 'responsetime',
              partition_field_name: 'country',
              by_field_name: 'airline',
            },
          ],
        },
        model_plot_config: {
          enabled: true,
          terms: 'US,AAL',
        },
      } as unknown) as Job;

      expect(
        isModelPlotEnabled(job, 0, [
          { fieldName: 'country', fieldValue: 'US' },
          { fieldName: 'airline', fieldValue: 'AAL' },
        ])
      ).toBe(true);
      expect(isModelPlotEnabled(job, 0, [{ fieldName: 'country', fieldValue: 'US' }])).toBe(false);
      expect(
        isModelPlotEnabled(job, 0, [
          { fieldName: 'country', fieldValue: 'GB' },
          { fieldName: 'airline', fieldValue: 'AAL' },
        ])
      ).toBe(false);
      expect(
        isModelPlotEnabled(job, 0, [
          { fieldName: 'country', fieldValue: 'JP' },
          { fieldName: 'airline', fieldValue: 'JAL' },
        ])
      ).toBe(false);
    });

    test('returns true for jobs in which model plot has not been enabled', () => {
      const job1 = ({
        analysis_config: {
          detectors: [
            {
              function: 'high_count',
              partition_field_name: 'status',
              detector_description: 'High count status code',
            },
          ],
        },
        model_plot_config: {
          enabled: false,
        },
      } as unknown) as CombinedJob;
      const job2 = ({} as unknown) as CombinedJob;

      expect(isModelPlotEnabled(job1, 0)).toBe(false);
      expect(isModelPlotEnabled(job2, 0)).toBe(false);
    });
  });

  describe('isJobVersionGte', () => {
    const job = ({
      job_version: '6.1.1',
    } as unknown) as CombinedJob;

    test('returns true for later job version', () => {
      expect(isJobVersionGte(job, '6.1.0')).toBe(true);
    });
    test('returns true for equal job version', () => {
      expect(isJobVersionGte(job, '6.1.1')).toBe(true);
    });
    test('returns false for earlier job version', () => {
      expect(isJobVersionGte(job, '6.1.2')).toBe(false);
    });
  });

  describe('mlFunctionToESAggregation', () => {
    test('returns correct ES aggregation type for ML function', () => {
      expect(mlFunctionToESAggregation('count')).toBe('count');
      expect(mlFunctionToESAggregation('low_count')).toBe('count');
      expect(mlFunctionToESAggregation('high_count')).toBe('count');
      expect(mlFunctionToESAggregation('non_zero_count')).toBe('count');
      expect(mlFunctionToESAggregation('low_non_zero_count')).toBe('count');
      expect(mlFunctionToESAggregation('high_non_zero_count')).toBe('count');
      expect(mlFunctionToESAggregation('distinct_count')).toBe('cardinality');
      expect(mlFunctionToESAggregation('low_distinct_count')).toBe('cardinality');
      expect(mlFunctionToESAggregation('high_distinct_count')).toBe('cardinality');
      expect(mlFunctionToESAggregation('metric')).toBe('avg');
      expect(mlFunctionToESAggregation('mean')).toBe('avg');
      expect(mlFunctionToESAggregation('low_mean')).toBe('avg');
      expect(mlFunctionToESAggregation('high_mean')).toBe('avg');
      expect(mlFunctionToESAggregation('min')).toBe('min');
      expect(mlFunctionToESAggregation('max')).toBe('max');
      expect(mlFunctionToESAggregation('sum')).toBe('sum');
      expect(mlFunctionToESAggregation('low_sum')).toBe('sum');
      expect(mlFunctionToESAggregation('high_sum')).toBe('sum');
      expect(mlFunctionToESAggregation('non_null_sum')).toBe('sum');
      expect(mlFunctionToESAggregation('low_non_null_sum')).toBe('sum');
      expect(mlFunctionToESAggregation('high_non_null_sum')).toBe('sum');
      expect(mlFunctionToESAggregation('rare')).toBe('count');
      expect(mlFunctionToESAggregation('freq_rare')).toBe(null);
      expect(mlFunctionToESAggregation('info_content')).toBe(null);
      expect(mlFunctionToESAggregation('low_info_content')).toBe(null);
      expect(mlFunctionToESAggregation('high_info_content')).toBe(null);
      expect(mlFunctionToESAggregation('median')).toBe('percentiles');
      expect(mlFunctionToESAggregation('low_median')).toBe('percentiles');
      expect(mlFunctionToESAggregation('high_median')).toBe('percentiles');
      expect(mlFunctionToESAggregation('varp')).toBe(null);
      expect(mlFunctionToESAggregation('low_varp')).toBe(null);
      expect(mlFunctionToESAggregation('high_varp')).toBe(null);
      expect(mlFunctionToESAggregation('time_of_day')).toBe(null);
      expect(mlFunctionToESAggregation('time_of_week')).toBe(null);
      expect(mlFunctionToESAggregation('lat_long')).toBe(null);
    });
  });

  describe('isJobIdValid', () => {
    test('returns true for job id: "good_job-name"', () => {
      expect(isJobIdValid('good_job-name')).toBe(true);
    });
    test('returns false for job id: "_bad_job-name"', () => {
      expect(isJobIdValid('_bad_job-name')).toBe(false);
    });
    test('returns false for job id: "bad_job-name_"', () => {
      expect(isJobIdValid('bad_job-name_')).toBe(false);
    });
    test('returns false for job id: "-bad_job-name"', () => {
      expect(isJobIdValid('-bad_job-name')).toBe(false);
    });
    test('returns false for job id: "bad_job-name-"', () => {
      expect(isJobIdValid('bad_job-name-')).toBe(false);
    });
    test('returns false for job id: "bad&job-name"', () => {
      expect(isJobIdValid('bad&job-name')).toBe(false);
    });
  });

  describe('prefixDatafeedId', () => {
    test('returns datafeed-prefix-job from datafeed-job"', () => {
      expect(prefixDatafeedId('datafeed-job', 'prefix-')).toBe('datafeed-prefix-job');
    });

    test('returns datafeed-prefix-job from job"', () => {
      expect(prefixDatafeedId('job', 'prefix-')).toBe('datafeed-prefix-job');
    });
  });

  describe('getSafeAggregationName', () => {
    test('"foo" should be "foo"', () => {
      expect(getSafeAggregationName('foo', 0)).toBe('foo');
    });
    test('"foo.bar" should be "foo.bar"', () => {
      expect(getSafeAggregationName('foo.bar', 0)).toBe('foo.bar');
    });
    test('"foo&bar" should be "field_0"', () => {
      expect(getSafeAggregationName('foo&bar', 0)).toBe('field_0');
    });
  });

  describe('getLatestDataOrBucketTimestamp', () => {
    test('returns expected value when no gap in data at end of bucket processing', () => {
      expect(getLatestDataOrBucketTimestamp(1549929594000, 1549928700000)).toBe(1549929594000);
    });
    test('returns expected value when there is a gap in data at end of bucket processing', () => {
      expect(getLatestDataOrBucketTimestamp(1549929594000, 1562256600000)).toBe(1562256600000);
    });
    test('returns expected value when job has not run', () => {
      expect(getLatestDataOrBucketTimestamp(undefined, undefined)).toBe(undefined);
    });
  });

  describe('getEarliestDatafeedStartTime', () => {
    test('returns expected value when no gap in data at end of bucket processing', () => {
      expect(getEarliestDatafeedStartTime(1549929594000, 1549928700000)).toBe(1549929594000);
    });
    test('returns expected value when there is a gap in data at end of bucket processing', () => {
      expect(getEarliestDatafeedStartTime(1549929594000, 1562256600000)).toBe(1562256600000);
    });
    test('returns expected value when bucket span is provided', () => {
      expect(
        getEarliestDatafeedStartTime(1549929594000, 1562256600000, moment.duration(1, 'h'))
      ).toBe(1562260200000);
    });

    test('returns expected value when job has not run', () => {
      expect(getLatestDataOrBucketTimestamp(undefined, undefined)).toBe(undefined);
    });
  });
});
