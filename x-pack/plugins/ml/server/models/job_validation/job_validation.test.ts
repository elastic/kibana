/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ILegacyScopedClusterClient } from 'kibana/server';

import { validateJob, ValidateJobPayload } from './job_validation';
import { JobValidationMessage } from '../../../common/constants/messages';

const mlClusterClient = ({
  // mock callAsCurrentUser
  callAsCurrentUser: (method: string) => {
    return new Promise((resolve) => {
      if (method === 'fieldCaps') {
        resolve({ fields: [] });
        return;
      } else if (method === 'ml.info') {
        resolve({
          limits: {
            effective_max_model_memory_limit: '100MB',
            max_model_memory_limit: '1GB',
          },
        });
      }
      resolve({});
    }) as Promise<any>;
  },

  // mock callAsInternalUser
  callAsInternalUser: (method: string) => {
    return new Promise((resolve) => {
      if (method === 'fieldCaps') {
        resolve({ fields: [] });
        return;
      } else if (method === 'ml.info') {
        resolve({
          limits: {
            effective_max_model_memory_limit: '100MB',
            max_model_memory_limit: '1GB',
          },
        });
      }
      resolve({});
    }) as Promise<any>;
  },
} as unknown) as ILegacyScopedClusterClient;

// Note: The tests cast `payload` as any
// so we can simulate possible runtime payloads
// that don't satisfy the TypeScript specs.
describe('ML - validateJob', () => {
  it('basic validation messages', () => {
    const payload = ({
      job: { analysis_config: { detectors: [] } },
    } as unknown) as ValidateJobPayload;

    return validateJob(mlClusterClient, payload).then((messages) => {
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
    const promises = testIds.map((id) => {
      const payload = ({
        job: {
          analysis_config: { detectors: [] },
          job_id: id,
        },
      } as unknown) as ValidateJobPayload;
      return validateJob(mlClusterClient, payload).catch(() => {
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
    const payload = ({
      job: { analysis_config: { detectors: [] }, groups: testIds },
    } as unknown) as ValidateJobPayload;

    return validateJob(mlClusterClient, payload).then((messages) => {
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
      const payload = ({
        job: { analysis_config: { bucket_span: format, detectors: [] } },
      } as unknown) as ValidateJobPayload;
      return validateJob(mlClusterClient, payload).catch(() => {
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

  it('at least one detector function is empty', () => {
    const payload = ({
      job: { analysis_config: { detectors: [] as Array<{ function?: string }> } },
    } as unknown) as ValidateJobPayload;
    payload.job.analysis_config.detectors.push({
      function: 'count',
    });
    payload.job.analysis_config.detectors.push({
      function: '',
    });
    payload.job.analysis_config.detectors.push({
      // @ts-expect-error
      function: undefined,
    });

    return validateJob(mlClusterClient, payload).then((messages) => {
      const ids = messages.map((m) => m.id);
      expect(ids.includes('detectors_function_empty')).toBe(true);
    });
  });

  it('detector function is not empty', () => {
    const payload = ({
      job: { analysis_config: { detectors: [] as Array<{ function?: string }> } },
    } as unknown) as ValidateJobPayload;
    payload.job.analysis_config.detectors.push({
      function: 'count',
    });

    return validateJob(mlClusterClient, payload).then((messages) => {
      const ids = messages.map((m) => m.id);
      expect(ids.includes('detectors_function_not_empty')).toBe(true);
    });
  });

  it('invalid index fields', () => {
    const payload = ({
      job: { analysis_config: { detectors: [] } },
      fields: {},
    } as unknown) as ValidateJobPayload;

    return validateJob(mlClusterClient, payload).then((messages) => {
      const ids = messages.map((m) => m.id);
      expect(ids.includes('index_fields_invalid')).toBe(true);
    });
  });

  it('valid index fields', () => {
    const payload = ({
      job: { analysis_config: { detectors: [] } },
      fields: { testField: {} },
    } as unknown) as ValidateJobPayload;

    return validateJob(mlClusterClient, payload).then((messages) => {
      const ids = messages.map((m) => m.id);
      expect(ids.includes('index_fields_valid')).toBe(true);
    });
  });

  const getBasicPayload = (): any => ({
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

    validateJob(mlClusterClient, payload).then(
      () =>
        done(
          new Error('Promise should not resolve for this test when influencers is not an Array.')
        ),
      () => done()
    );
  });

  it('detect duplicate detectors', () => {
    const payload = getBasicPayload() as any;
    payload.job.analysis_config.detectors.push({ function: 'count' });
    return validateJob(mlClusterClient, payload).then((messages) => {
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

  it('dedupe duplicate messages', () => {
    const payload = getBasicPayload() as any;
    // in this test setup, the following configuration passes
    // the duplicate detectors check, but would return the same
    // 'field_not_aggregatable' message for both detectors.
    // deduplicating exact message configuration object catches this.
    payload.job.analysis_config.detectors = [
      { function: 'count', by_field_name: 'airline' },
      { function: 'count', partition_field_name: 'airline' },
    ];
    return validateJob(mlClusterClient, payload).then((messages) => {
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

  // Failing https://github.com/elastic/kibana/issues/65865
  it('basic validation passes, extended checks return some messages', () => {
    const payload = getBasicPayload();
    return validateJob(mlClusterClient, payload).then((messages) => {
      const ids = messages.map((m) => m.id);
      expect(ids).toStrictEqual([
        'job_id_valid',
        'detectors_function_not_empty',
        'index_fields_valid',
        'time_field_invalid',
      ]);
    });
  });

  // Failing https://github.com/elastic/kibana/issues/65866
  it('categorization job using mlcategory passes aggregatable field check', () => {
    const payload: any = {
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

    return validateJob(mlClusterClient, payload).then((messages) => {
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

  it('non-existent field reported as non aggregatable', () => {
    const payload: any = {
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

    return validateJob(mlClusterClient, payload).then((messages) => {
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

  // Failing https://github.com/elastic/kibana/issues/65867
  it('script field not reported as non aggregatable', () => {
    const payload: any = {
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

    return validateJob(mlClusterClient, payload).then((messages) => {
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

  // the following two tests validate the correct template rendering of
  // urls in messages with {{version}} in them to be replaced with the
  // specified version. (defaulting to 'current')
  const docsTestPayload = getBasicPayload() as any;
  docsTestPayload.job.analysis_config.detectors = [{ function: 'count', by_field_name: 'airline' }];
  it('creates a docs url pointing to the current docs version', () => {
    return validateJob(mlClusterClient, docsTestPayload).then((messages) => {
      const message = messages[
        messages.findIndex((m) => m.id === 'field_not_aggregatable')
      ] as JobValidationMessage;
      expect(message.url!.search('/current/')).not.toBe(-1);
    });
  });

  it('creates a docs url pointing to the master docs version', () => {
    return validateJob(mlClusterClient, docsTestPayload, 'master').then((messages) => {
      const message = messages[
        messages.findIndex((m) => m.id === 'field_not_aggregatable')
      ] as JobValidationMessage;
      expect(message.url!.search('/master/')).not.toBe(-1);
    });
  });
});
