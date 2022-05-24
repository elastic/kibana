/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';

import { validateJob, ValidateJobPayload } from './job_validation';
import { ES_CLIENT_TOTAL_HITS_RELATION } from '../../../common/types/es_client';
import type { MlClient } from '../../lib/ml_client';
import type { AuthorizationHeader } from '../../lib/request_authorization';

const callAs = elasticsearchServiceMock.createElasticsearchClient();
// @ts-expect-error incorrect types
callAs.fieldCaps.mockResponse({ fields: [] });
callAs.search.mockResponse({
  // @ts-expect-error incorrect types
  hits: { total: { value: 1, relation: ES_CLIENT_TOTAL_HITS_RELATION.EQ } },
});

const authHeader: AuthorizationHeader = {};

const mlClusterClient = {
  asCurrentUser: callAs,
  asInternalUser: callAs,
} as unknown as IScopedClusterClient;

const mlClient = {
  info: () =>
    Promise.resolve({
      limits: {
        effective_max_model_memory_limit: '100MB',
        max_model_memory_limit: '1GB',
      },
    }),
  previewDatafeed: () => Promise.resolve([{}]),
} as unknown as MlClient;

// Note: The tests cast `payload` as any
// so we can simulate possible runtime payloads
// that don't satisfy the TypeScript specs.
describe('ML - validateJob', () => {
  it('basic validation messages', async () => {
    const payload = {
      job: { analysis_config: { detectors: [] } },
    } as unknown as ValidateJobPayload;

    return validateJob(mlClusterClient, mlClient, payload, authHeader).then((messages) => {
      const ids = messages.map((m) => m.id);

      expect(ids).toStrictEqual([
        'job_id_empty',
        'detectors_empty',
        'bucket_span_empty',
        'skipped_extended_tests',
      ]);
    });
  });

  const jobIdTests = (testIds: string[], messageId: string) => {
    const promises = testIds.map(async (id) => {
      const payload = {
        job: {
          analysis_config: { detectors: [] },
          job_id: id,
        },
      } as unknown as ValidateJobPayload;
      return validateJob(mlClusterClient, mlClient, payload, authHeader).catch(() => {
        new Error('Promise should not fail for jobIdTests.');
      });
    });

    return Promise.all(promises).then((testResults) => {
      testResults.forEach((messages) => {
        expect(Array.isArray(messages)).toBe(true);
        if (Array.isArray(messages)) {
          const ids = messages.map((m) => m.id);
          expect(ids.includes(messageId)).toBe(true);
        }
      });
    });
  };

  const jobGroupIdTest = (testIds: string[], messageId: string) => {
    const payload = {
      job: { analysis_config: { detectors: [] }, groups: testIds },
    } as unknown as ValidateJobPayload;

    return validateJob(mlClusterClient, mlClient, payload, authHeader).then((messages) => {
      const ids = messages.map((m) => m.id);
      expect(ids.includes(messageId)).toBe(true);
    });
  };

  const invalidTestIds = [
    '$',
    '$test',
    'test$',
    'te$st',
    '-',
    '-test',
    'test-',
    '-test-',
    '_',
    '_test',
    'test_',
    '_test_',
  ];
  it('invalid job ids', () => {
    return jobIdTests(invalidTestIds, 'job_id_invalid');
  });
  it('invalid job group ids', () => {
    return jobGroupIdTest(invalidTestIds, 'job_group_id_invalid');
  });

  const validTestIds = ['1test', 'test1', 'test-1', 'test_1'];
  it('valid job ids', () => {
    return jobIdTests(validTestIds, 'job_id_valid');
  });
  it('valid job group ids', () => {
    return jobGroupIdTest(validTestIds, 'job_group_id_valid');
  });

  const bucketSpanFormatTests = (testFormats: string[], messageId: string) => {
    const promises = testFormats.map((format) => {
      const payload = {
        job: { analysis_config: { bucket_span: format, detectors: [] } },
      } as unknown as ValidateJobPayload;
      return validateJob(mlClusterClient, mlClient, payload, authHeader).catch(() => {
        new Error('Promise should not fail for bucketSpanFormatTests.');
      });
    });

    return Promise.all(promises).then((testResults) => {
      testResults.forEach((messages) => {
        expect(Array.isArray(messages)).toBe(true);
        if (Array.isArray(messages)) {
          const ids = messages.map((m) => m.id);
          expect(ids.includes(messageId)).toBe(true);
        }
      });
    });
  };
  it('invalid bucket span formats', () => {
    const invalidBucketSpanFormats = ['a', '10', '$', '500ms', '1w', '2M', '1y'];
    return bucketSpanFormatTests(invalidBucketSpanFormats, 'bucket_span_invalid');
  });
  it('valid bucket span formats', () => {
    const validBucketSpanFormats = ['5000ms', '1s', '2m', '4h', '10d'];
    return bucketSpanFormatTests(validBucketSpanFormats, 'bucket_span_valid');
  });

  it('at least one detector function is empty', async () => {
    const payload = {
      job: { analysis_config: { detectors: [] as Array<{ function?: string }> } },
    } as unknown as ValidateJobPayload;
    payload.job.analysis_config.detectors.push({
      function: 'count',
    });
    payload.job.analysis_config.detectors.push({
      function: '',
    });
    payload.job.analysis_config.detectors.push({
      // @ts-expect-error incorrect type on purpose for test
      function: undefined,
    });

    return validateJob(mlClusterClient, mlClient, payload, authHeader).then((messages) => {
      const ids = messages.map((m) => m.id);
      expect(ids.includes('detectors_function_empty')).toBe(true);
    });
  });

  it('detector function is not empty', async () => {
    const payload = {
      job: { analysis_config: { detectors: [] as Array<{ function?: string }> } },
    } as unknown as ValidateJobPayload;
    payload.job.analysis_config.detectors.push({
      function: 'count',
    });

    return validateJob(mlClusterClient, mlClient, payload, authHeader).then((messages) => {
      const ids = messages.map((m) => m.id);
      expect(ids.includes('detectors_function_not_empty')).toBe(true);
    });
  });

  it('invalid index fields', async () => {
    const payload = {
      job: { analysis_config: { detectors: [] } },
      fields: {},
    } as unknown as ValidateJobPayload;

    return validateJob(mlClusterClient, mlClient, payload, authHeader).then((messages) => {
      const ids = messages.map((m) => m.id);
      expect(ids.includes('index_fields_invalid')).toBe(true);
    });
  });

  it('valid index fields', async () => {
    const payload = {
      job: { analysis_config: { detectors: [] } },
      fields: { testField: {} },
    } as unknown as ValidateJobPayload;

    return validateJob(mlClusterClient, mlClient, payload, authHeader).then((messages) => {
      const ids = messages.map((m) => m.id);
      expect(ids.includes('index_fields_valid')).toBe(true);
    });
  });

  const getBasicPayload = (): ValidateJobPayload => ({
    job: {
      job_id: 'test',
      analysis_config: {
        bucket_span: '15m',
        detectors: [
          {
            function: 'count',
          },
        ] as Array<{ function: string; by_field_name?: string; partition_field_name?: string }>,
        influencers: [],
      },
      data_description: { time_field: '@timestamp' },
      datafeed_config: { indices: [] },
    },
    fields: { testField: {} },
  });

  it('throws an error because job.analysis_config.influencers is not an Array', (done) => {
    const payload = getBasicPayload() as any;
    delete payload.job.analysis_config.influencers;

    validateJob(mlClusterClient, mlClient, payload, authHeader).then(
      () =>
        done(
          new Error('Promise should not resolve for this test when influencers is not an Array.')
        ),
      () => done()
    );
  });

  it('detect duplicate detectors', async () => {
    const payload = getBasicPayload() as any;
    payload.job.analysis_config.detectors.push({ function: 'count' });
    return validateJob(mlClusterClient, mlClient, payload, authHeader).then((messages) => {
      const ids = messages.map((m) => m.id);
      expect(ids).toStrictEqual([
        'job_id_valid',
        'detectors_function_not_empty',
        'detectors_duplicates',
        'bucket_span_valid',
        'index_fields_valid',
        'skipped_extended_tests',
      ]);
    });
  });

  it('dedupe duplicate messages', async () => {
    const payload = getBasicPayload() as any;
    // in this test setup, the following configuration passes
    // the duplicate detectors check, but would return the same
    // 'field_not_aggregatable' message for both detectors.
    // deduplicating exact message configuration object catches this.
    payload.job.analysis_config.detectors = [
      { function: 'count', by_field_name: 'airline' },
      { function: 'count', partition_field_name: 'airline' },
    ];
    return validateJob(mlClusterClient, mlClient, payload, authHeader).then((messages) => {
      const ids = messages.map((m) => m.id);
      expect(ids).toStrictEqual([
        'job_id_valid',
        'detectors_function_not_empty',
        'index_fields_valid',
        'field_not_aggregatable',
        'time_field_invalid',
      ]);
    });
  });

  it('basic validation passes, extended checks return some messages', async () => {
    const payload = getBasicPayload();
    return validateJob(mlClusterClient, mlClient, payload, authHeader).then((messages) => {
      const ids = messages.map((m) => m.id);
      expect(ids).toStrictEqual([
        'job_id_valid',
        'detectors_function_not_empty',
        'index_fields_valid',
        'time_field_invalid',
      ]);
    });
  });

  it('categorization job using mlcategory passes aggregatable field check', async () => {
    const payload: ValidateJobPayload = {
      job: {
        job_id: 'categorization_test',
        analysis_config: {
          bucket_span: '15m',
          detectors: [
            {
              function: 'count',
              by_field_name: 'mlcategory',
            },
          ],
          categorization_field_name: 'message_text',
          influencers: [],
        },
        data_description: { time_field: '@timestamp' },
        datafeed_config: { indices: [] },
      },
      fields: { testField: {} },
    };

    return validateJob(mlClusterClient, mlClient, payload, authHeader).then((messages) => {
      const ids = messages.map((m) => m.id);
      expect(ids).toStrictEqual([
        'job_id_valid',
        'detectors_function_not_empty',
        'index_fields_valid',
        'success_cardinality',
        'time_field_invalid',
        'influencer_low_suggestion',
      ]);
    });
  });

  it('non-existent field reported as non aggregatable', async () => {
    const payload: ValidateJobPayload = {
      job: {
        job_id: 'categorization_test',
        analysis_config: {
          bucket_span: '15m',
          detectors: [
            {
              function: 'count',
              partition_field_name: 'ailine',
            },
          ],
          influencers: [],
        },
        data_description: { time_field: '@timestamp' },
        datafeed_config: { indices: [] },
      },
      fields: { testField: {} },
    };

    return validateJob(mlClusterClient, mlClient, payload, authHeader).then((messages) => {
      const ids = messages.map((m) => m.id);
      expect(ids).toStrictEqual([
        'job_id_valid',
        'detectors_function_not_empty',
        'index_fields_valid',
        'field_not_aggregatable',
        'time_field_invalid',
      ]);
    });
  });

  it('script field not reported as non aggregatable', async () => {
    const payload: ValidateJobPayload = {
      job: {
        job_id: 'categorization_test',
        analysis_config: {
          bucket_span: '15m',
          detectors: [
            {
              function: 'count',
              partition_field_name: 'custom_script_field',
            },
          ],
          influencers: [],
        },
        data_description: { time_field: '@timestamp' },
        datafeed_config: {
          indices: [],
          script_fields: {
            custom_script_field: {
              script: {
                source: `'some script'`,
                lang: 'painless',
              },
            },
          },
        },
      },
      fields: { testField: {} },
    };

    return validateJob(mlClusterClient, mlClient, payload, authHeader).then((messages) => {
      const ids = messages.map((m) => m.id);
      expect(ids).toStrictEqual([
        'job_id_valid',
        'detectors_function_not_empty',
        'index_fields_valid',
        'success_cardinality',
        'time_field_invalid',
        'influencer_low_suggestion',
      ]);
    });
  });

  it('datafeed preview contains no docs', async () => {
    const payload: ValidateJobPayload = {
      job: {
        job_id: 'categorization_test',
        analysis_config: {
          bucket_span: '15m',
          detectors: [
            {
              function: 'count',
              partition_field_name: 'custom_script_field',
            },
          ],
          influencers: [''],
        },
        data_description: { time_field: '@timestamp' },
        datafeed_config: {
          indices: [],
        },
      },
      fields: { testField: {} },
    };

    const mlClientEmptyDatafeedPreview = {
      ...mlClient,
      previewDatafeed: () => Promise.resolve({ body: [] }),
    } as unknown as MlClient;

    return validateJob(mlClusterClient, mlClientEmptyDatafeedPreview, payload, authHeader).then(
      (messages) => {
        const ids = messages.map((m) => m.id);
        expect(ids).toStrictEqual([
          'job_id_valid',
          'detectors_function_not_empty',
          'index_fields_valid',
          'field_not_aggregatable',
          'time_field_invalid',
          'datafeed_preview_no_documents',
        ]);
      }
    );
  });

  it('datafeed preview failed', async () => {
    const payload: ValidateJobPayload = {
      job: {
        job_id: 'categorization_test',
        analysis_config: {
          bucket_span: '15m',
          detectors: [
            {
              function: 'count',
              partition_field_name: 'custom_script_field',
            },
          ],
          influencers: [''],
        },
        data_description: { time_field: '@timestamp' },
        datafeed_config: {
          indices: [],
        },
      },
      fields: { testField: {} },
    };

    const mlClientEmptyDatafeedPreview = {
      ...mlClient,
      previewDatafeed: () => Promise.reject({}),
    } as unknown as MlClient;

    return validateJob(mlClusterClient, mlClientEmptyDatafeedPreview, payload, authHeader).then(
      (messages) => {
        const ids = messages.map((m) => m.id);
        expect(ids).toStrictEqual([
          'job_id_valid',
          'detectors_function_not_empty',
          'index_fields_valid',
          'field_not_aggregatable',
          'time_field_invalid',
          'datafeed_preview_failed',
        ]);
      }
    );
  });
});
