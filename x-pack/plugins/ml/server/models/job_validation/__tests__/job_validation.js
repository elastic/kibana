/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { validateJob } from '../job_validation';

// mock callWithRequest
const callWithRequest = () => {
  return new Promise(resolve => {
    resolve({});
  });
};

describe('ML - validateJob', () => {
  it('calling factory without payload throws an error', done => {
    validateJob(callWithRequest).then(
      () => done(new Error('Promise should not resolve for this test without payload.')),
      () => done()
    );
  });

  it('calling factory with incomplete payload throws an error', done => {
    const payload = {};

    validateJob(callWithRequest, payload).then(
      () => done(new Error('Promise should not resolve for this test with incomplete payload.')),
      () => done()
    );
  });

  it('throws an error because job.analysis_config is not an object', done => {
    const payload = { job: {} };

    validateJob(callWithRequest, payload).then(
      () =>
        done(
          new Error(
            'Promise should not resolve for this test with job.analysis_config not being an object.'
          )
        ),
      () => done()
    );
  });

  it('throws an error because job.analysis_config.detectors is not an Array', done => {
    const payload = { job: { analysis_config: {} } };

    validateJob(callWithRequest, payload).then(
      () =>
        done(new Error('Promise should not resolve for this test when detectors is not an Array.')),
      () => done()
    );
  });

  it('basic validation messages', () => {
    const payload = { job: { analysis_config: { detectors: [] } } };

    return validateJob(callWithRequest, payload).then(messages => {
      const ids = messages.map(m => m.id);

      expect(ids).to.eql([
        'job_id_empty',
        'detectors_empty',
        'bucket_span_empty',
        'skipped_extended_tests',
      ]);
    });
  });

  const jobIdTests = (testIds, messageId) => {
    const promises = testIds.map(id => {
      const payload = { job: { analysis_config: { detectors: [] } } };
      payload.job.job_id = id;
      return validateJob(callWithRequest, payload).catch(() => {
        new Error('Promise should not fail for jobIdTests.');
      });
    });

    return Promise.all(promises).then(testResults => {
      testResults.forEach(messages => {
        const ids = messages.map(m => m.id);
        expect(ids.includes(messageId)).to.equal(true);
      });
    });
  };

  const jobGroupIdTest = (testIds, messageId) => {
    const payload = { job: { analysis_config: { detectors: [] } } };
    payload.job.groups = testIds;

    return validateJob(callWithRequest, payload).then(messages => {
      const ids = messages.map(m => m.id);
      expect(ids.includes(messageId)).to.equal(true);
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

  const bucketSpanFormatTests = (testFormats, messageId) => {
    const promises = testFormats.map(format => {
      const payload = { job: { analysis_config: { detectors: [] } } };
      payload.job.analysis_config.bucket_span = format;
      return validateJob(callWithRequest, payload).catch(() => {
        new Error('Promise should not fail for bucketSpanFormatTests.');
      });
    });

    return Promise.all(promises).then(testResults => {
      testResults.forEach(messages => {
        const ids = messages.map(m => m.id);
        expect(ids.includes(messageId)).to.equal(true);
      });
    });
  };
  it('invalid bucket span formats', () => {
    const invalidBucketSpanFormats = ['a', '10', '$'];
    return bucketSpanFormatTests(invalidBucketSpanFormats, 'bucket_span_invalid');
  });
  it('valid bucket span formats', () => {
    const validBucketSpanFormats = ['1s', '4h', '10d', '6w', '2m', '3y'];
    return bucketSpanFormatTests(validBucketSpanFormats, 'bucket_span_valid');
  });

  it('at least one detector function is empty', () => {
    const payload = { job: { analysis_config: { detectors: [] } } };
    payload.job.analysis_config.detectors.push({
      function: 'count',
    });
    payload.job.analysis_config.detectors.push({
      function: '',
    });
    payload.job.analysis_config.detectors.push({
      function: undefined,
    });

    return validateJob(callWithRequest, payload).then(messages => {
      const ids = messages.map(m => m.id);
      expect(ids.includes('detectors_function_empty')).to.equal(true);
    });
  });

  it('detector function is not empty', () => {
    const payload = { job: { analysis_config: { detectors: [] } } };
    payload.job.analysis_config.detectors.push({
      function: 'count',
    });

    return validateJob(callWithRequest, payload).then(messages => {
      const ids = messages.map(m => m.id);
      expect(ids.includes('detectors_function_not_empty')).to.equal(true);
    });
  });

  it('invalid index fields', () => {
    const payload = {
      job: { analysis_config: { detectors: [] } },
      fields: {},
    };

    return validateJob(callWithRequest, payload).then(messages => {
      const ids = messages.map(m => m.id);
      expect(ids.includes('index_fields_invalid')).to.equal(true);
    });
  });

  it('valid index fields', () => {
    const payload = {
      job: { analysis_config: { detectors: [] } },
      fields: { testField: {} },
    };

    return validateJob(callWithRequest, payload).then(messages => {
      const ids = messages.map(m => m.id);
      expect(ids.includes('index_fields_valid')).to.equal(true);
    });
  });

  const getBasicPayload = () => ({
    job: {
      job_id: 'test',
      analysis_config: {
        bucket_span: '15m',
        detectors: [
          {
            function: 'count',
          },
        ],
        influencers: [],
      },
      data_description: { time_field: '@timestamp' },
      datafeed_config: { indices: [] },
    },
    fields: { testField: {} },
  });

  it('throws an error because job.analysis_config.influencers is not an Array', done => {
    const payload = getBasicPayload();
    delete payload.job.analysis_config.influencers;

    validateJob(callWithRequest, payload).then(
      () =>
        done(
          new Error('Promise should not resolve for this test when influencers is not an Array.')
        ),
      () => done()
    );
  });

  it('detect duplicate detectors', () => {
    const payload = getBasicPayload();
    payload.job.analysis_config.detectors.push({ function: 'count' });
    return validateJob(callWithRequest, payload).then(messages => {
      const ids = messages.map(m => m.id);
      expect(ids).to.eql([
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
    const payload = getBasicPayload();
    // in this test setup, the following configuration passes
    // the duplicate detectors check, but would return the same
    // 'field_not_aggregatable' message for both detectors.
    // deduplicating exact message configuration object catches this.
    payload.job.analysis_config.detectors = [
      { function: 'count', by_field_name: 'airline' },
      { function: 'count', partition_field_name: 'airline' },
    ];
    return validateJob(callWithRequest, payload).then(messages => {
      const ids = messages.map(m => m.id);
      expect(ids).to.eql([
        'job_id_valid',
        'detectors_function_not_empty',
        'index_fields_valid',
        'field_not_aggregatable',
        'time_field_invalid',
      ]);
    });
  });

  it('basic validation passes, extended checks return some messages', () => {
    const payload = getBasicPayload();
    return validateJob(callWithRequest, payload).then(messages => {
      const ids = messages.map(m => m.id);
      expect(ids).to.eql([
        'job_id_valid',
        'detectors_function_not_empty',
        'index_fields_valid',
        'time_field_invalid',
      ]);
    });
  });

  it('categorization job using mlcategory passes aggregatable field check', () => {
    const payload = {
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

    return validateJob(callWithRequest, payload).then(messages => {
      const ids = messages.map(m => m.id);
      expect(ids).to.eql([
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
    const payload = {
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

    return validateJob(callWithRequest, payload).then(messages => {
      const ids = messages.map(m => m.id);
      expect(ids).to.eql([
        'job_id_valid',
        'detectors_function_not_empty',
        'index_fields_valid',
        'field_not_aggregatable',
        'time_field_invalid',
      ]);
    });
  });

  it('script field not reported as non aggregatable', () => {
    const payload = {
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

    return validateJob(callWithRequest, payload).then(messages => {
      const ids = messages.map(m => m.id);
      expect(ids).to.eql([
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
  const docsTestPayload = getBasicPayload();
  docsTestPayload.job.analysis_config.detectors = [{ function: 'count', by_field_name: 'airline' }];
  it('creates a docs url pointing to the current docs version', () => {
    return validateJob(callWithRequest, docsTestPayload).then(messages => {
      const message = messages[messages.findIndex(m => m.id === 'field_not_aggregatable')];
      expect(message.url.search('/current/')).not.to.be(-1);
    });
  });

  it('creates a docs url pointing to the master docs version', () => {
    return validateJob(callWithRequest, docsTestPayload, 'master').then(messages => {
      const message = messages[messages.findIndex(m => m.id === 'field_not_aggregatable')];
      expect(message.url.search('/master/')).not.to.be(-1);
    });
  });
});
