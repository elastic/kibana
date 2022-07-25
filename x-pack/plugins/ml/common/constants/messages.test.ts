/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { docLinksServiceMock } from '@kbn/core/public/mocks';

import { parseMessages } from './messages';

import {
  basicValidJobMessages,
  basicInvalidJobMessages,
  nonBasicIssuesMessages,
} from './messages.test.mock';

describe('Constants: Messages parseMessages()', () => {
  const docLinksService = docLinksServiceMock.createStartContract();

  it('should parse valid job configuration messages', () => {
    expect(parseMessages(basicValidJobMessages, docLinksService)).toStrictEqual([
      {
        heading: 'Job ID format is valid',
        id: 'job_id_valid',
        status: 'success',
        text: 'Lowercase alphanumeric (a-z and 0-9) characters, hyphens or underscores, starts and ends with an alphanumeric character, and is no more than 64 characters long.',
        url: 'https://www.elastic.co/guide/en/elasticsearch/reference/mocked-test-branch/ml-put-job.html#ml-put-job-path-parms',
      },
      {
        heading: 'Detector functions',
        id: 'detectors_function_not_empty',
        status: 'success',
        text: 'Presence of detector functions validated in all detectors.',
        url: 'https://www.elastic.co/guide/en/machine-learning/mocked-test-branch/ml-ad-run-jobs.html#ml-ad-detectors',
      },
      {
        bucketSpan: '15m',
        heading: 'Bucket span',
        id: 'success_bucket_span',
        status: 'success',
        text: 'Format of "15m" is valid and passed validation checks.',
        url: 'https://www.elastic.co/guide/en/machine-learning/mocked-test-branch/ml-ad-run-jobs.html#ml-ad-bucket-span',
      },
      {
        heading: 'Time range',
        id: 'success_time_range',
        status: 'success',
        text: 'Valid and long enough to model patterns in the data.',
      },
      {
        heading: 'Model memory limit',
        id: 'success_mml',
        status: 'success',
        text: 'Valid and within the estimated model memory limit.',
        url: 'https://www.elastic.co/guide/en/machine-learning/mocked-test-branch/ml-ad-run-jobs.html#ml-ad-model-memory-limits',
      },
    ]);
  });

  it('should parse basic invalid job configuration messages', () => {
    expect(parseMessages(basicInvalidJobMessages, docLinksService)).toStrictEqual([
      {
        id: 'job_id_invalid',
        status: 'error',
        text: 'Job ID is invalid. It can contain lowercase alphanumeric (a-z and 0-9) characters, hyphens or underscores and must start and end with an alphanumeric character.',
        url: 'https://www.elastic.co/guide/en/elasticsearch/reference/mocked-test-branch/ml-put-job.html#ml-put-job-path-parms',
      },
      {
        heading: 'Detector functions',
        id: 'detectors_function_not_empty',
        status: 'success',
        text: 'Presence of detector functions validated in all detectors.',
        url: 'https://www.elastic.co/guide/en/machine-learning/mocked-test-branch/ml-ad-run-jobs.html#ml-ad-detectors',
      },
      {
        bucketSpan: '15m',
        heading: 'Bucket span',
        id: 'bucket_span_valid',
        status: 'success',
        text: 'Format of "15m" is valid.',
        url: 'https://www.elastic.co/guide/en/elasticsearch/reference/mocked-test-branch/ml-put-job.html#put-analysisconfig',
      },
      {
        id: 'skipped_extended_tests',
        status: 'warning',
        text: 'Skipped additional checks because the basic requirements of the job configuration were not met.',
      },
    ]);
  });

  it('should parse non-basic issues messages', () => {
    expect(parseMessages(nonBasicIssuesMessages, docLinksService)).toStrictEqual([
      {
        heading: 'Job ID format is valid',
        id: 'job_id_valid',
        status: 'success',
        text: 'Lowercase alphanumeric (a-z and 0-9) characters, hyphens or underscores, starts and ends with an alphanumeric character, and is no more than 64 characters long.',
        url: 'https://www.elastic.co/guide/en/elasticsearch/reference/mocked-test-branch/ml-put-job.html#ml-put-job-path-parms',
      },
      {
        heading: 'Detector functions',
        id: 'detectors_function_not_empty',
        status: 'success',
        text: 'Presence of detector functions validated in all detectors.',
        url: 'https://www.elastic.co/guide/en/machine-learning/mocked-test-branch/ml-ad-run-jobs.html#ml-ad-detectors',
      },
      {
        id: 'cardinality_model_plot_high',
        status: 'warning',
        text: 'The estimated cardinality of undefined of fields relevant to creating model plots might result in resource intensive jobs.',
      },
      {
        fieldName: 'order_id',
        id: 'cardinality_partition_field',
        status: 'warning',
        text: 'Cardinality of partition_field "order_id" is above 1000 and might result in high memory usage.',
        url: 'https://www.elastic.co/guide/en/machine-learning/mocked-test-branch/ml-ad-run-jobs.html#ml-ad-cardinality',
      },
      {
        heading: 'Bucket span',
        id: 'bucket_span_high',
        status: 'info',
        text: 'Bucket span is 1 day or more. Be aware that days are considered as UTC days, not local days.',
        url: 'https://www.elastic.co/guide/en/machine-learning/mocked-test-branch/ml-ad-run-jobs.html#ml-ad-bucket-span',
      },
      {
        bucketSpanCompareFactor: 25,
        heading: 'Time range',
        id: 'time_range_short',
        minTimeSpanReadable: '2 hours',
        status: 'warning',
        text: 'The selected or available time range might be too short. The recommended minimum time range should be at least 2 hours and 25 times the bucket span.',
      },
      {
        id: 'success_influencers',
        status: 'success',
        text: 'Influencer configuration passed the validation checks.',
        url: 'https://www.elastic.co/guide/en/machine-learning/mocked-test-branch/ml-ad-run-jobs.html#ml-ad-influencers',
      },
      {
        id: 'half_estimated_mml_greater_than_mml',
        mml: '1MB',
        status: 'warning',
        text: 'The specified model memory limit is less than half of the estimated model memory limit and will likely hit the hard limit.',
        url: 'https://www.elastic.co/guide/en/machine-learning/mocked-test-branch/ml-ad-run-jobs.html#ml-ad-model-memory-limits',
      },
      {
        id: 'missing_summary_count_field_name',
        status: 'error',
        text: 'A job configured with a datafeed with aggregations must set summary_count_field_name; use doc_count or suitable alternative.',
      },
      {
        id: 'datafeed_preview_failed',
        status: 'error',
        text: 'The datafeed preview failed. This may be due to an error in the job or datafeed configurations.',
      },
    ]);
  });
});
