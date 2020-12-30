/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CombinedJob } from '../../../common/types/anomaly_detection_jobs';

import { validateInfluencers } from './validate_influencers';

describe('ML - validateInfluencers', () => {
  it('called without arguments throws an error', (done) => {
    validateInfluencers((undefined as unknown) as CombinedJob).then(
      () => done(new Error('Promise should not resolve for this test without job argument.')),
      () => done()
    );
  });

  it('called with non-valid job argument #1, missing analysis_config', (done) => {
    validateInfluencers(({} as unknown) as CombinedJob).then(
      () => done(new Error('Promise should not resolve for this test without valid job argument.')),
      () => done()
    );
  });

  it('called with non-valid job argument #2, missing analysis_config.influencers', (done) => {
    const job = {
      analysis_config: {},
      datafeed_config: { indices: [] },
      data_description: { time_field: '@timestamp' },
    };
    validateInfluencers((job as unknown) as CombinedJob).then(
      () => done(new Error('Promise should not resolve for this test without valid job argument.')),
      () => done()
    );
  });

  it('called with non-valid job argument #3, missing analysis_config.detectors', (done) => {
    const job = {
      analysis_config: { influencers: [] },
      datafeed_config: { indices: [] },
      data_description: { time_field: '@timestamp' },
    };
    validateInfluencers((job as unknown) as CombinedJob).then(
      () => done(new Error('Promise should not resolve for this test without valid job argument.')),
      () => done()
    );
  });

  const getJobConfig: (
    influencers?: string[],
    detectors?: CombinedJob['analysis_config']['detectors']
  ) => CombinedJob = (influencers = [], detectors = []) =>
    (({
      analysis_config: { detectors, influencers },
      data_description: { time_field: '@timestamp' },
      datafeed_config: {
        indices: [],
      },
    } as unknown) as CombinedJob);

  it('success_influencer', () => {
    const job = getJobConfig(['airline']);
    return validateInfluencers(job).then((messages) => {
      const ids = messages.map((m) => m.id);
      expect(ids).toStrictEqual(['success_influencers']);
    });
  });

  it('skip influencer checks', () => {
    const job = getJobConfig(
      [],
      [
        {
          detector_description: 'count',
          function: 'count',
          detector_index: 0,
        },
      ]
    );

    return validateInfluencers(job).then((messages) => {
      const ids = messages.map((m) => m.id);
      expect(ids).toStrictEqual([]);
    });
  });

  it('influencer_low', () => {
    const job = getJobConfig();
    return validateInfluencers(job).then((messages) => {
      const ids = messages.map((m) => m.id);
      expect(ids).toStrictEqual(['influencer_low']);
    });
  });

  it('influencer_high', () => {
    const job = getJobConfig(['i1', 'i2', 'i3', 'i4']);
    return validateInfluencers(job).then((messages) => {
      const ids = messages.map((m) => m.id);
      expect(ids).toStrictEqual(['influencer_high']);
    });
  });

  it('influencer_suggestion', () => {
    const job = getJobConfig(
      [],
      [
        {
          detector_description: 'count',
          function: 'count',
          partition_field_name: 'airline',
          detector_index: 0,
        },
      ]
    );
    return validateInfluencers(job).then((messages) => {
      const ids = messages.map((m) => m.id);
      expect(ids).toStrictEqual(['influencer_low_suggestion']);
    });
  });

  it('influencer_suggestions', () => {
    const job = getJobConfig(
      [],
      [
        {
          detector_description: 'count',
          function: 'count',
          partition_field_name: 'partition_field',
          detector_index: 0,
        },
        {
          detector_description: 'count',
          function: 'count',
          by_field_name: 'by_field',
          detector_index: 0,
        },
        {
          detector_description: 'count',
          function: 'count',
          over_field_name: 'over_field',
          detector_index: 0,
        },
      ]
    );
    return validateInfluencers(job).then((messages) => {
      expect(messages).toStrictEqual([
        {
          id: 'influencer_low_suggestions',
          influencerSuggestion: '["partition_field","by_field","over_field"]',
        },
      ]);
    });
  });
});
