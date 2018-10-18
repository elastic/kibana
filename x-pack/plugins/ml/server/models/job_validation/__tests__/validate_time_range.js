/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import _ from 'lodash';
import expect from 'expect.js';
import { validateTimeRange } from '../validate_time_range';

import mockTimeField from './mock_time_field';
import mockTimeRange from './mock_time_range';

const mockSearchResponse = {
  fieldCaps: mockTimeField,
  search: mockTimeRange
};

const callWithRequestFactory = (resp) => {
  return (path) => {
    return new Promise((resolve) => {
      resolve(resp[path]);
    });
  };
};

describe('ML - validateTimeRange', () => {

  it('called without arguments', (done) => {
    validateTimeRange(callWithRequestFactory(mockSearchResponse)).then(
      () => done(new Error('Promise should not resolve for this test without job argument.')),
      () => done()
    );
  });

  it('called with non-valid job argument #2, missing datafeed_config', (done) => {
    validateTimeRange(callWithRequestFactory(mockSearchResponse), { analysis_config: {} }).then(
      () => done(new Error('Promise should not resolve for this test without valid job argument.')),
      () => done()
    );
  });

  it('called with non-valid job argument #3, missing datafeed_config.indices', (done) => {
    const job = { analysis_config: {}, datafeed_config: {} };
    validateTimeRange(callWithRequestFactory(mockSearchResponse), job).then(
      () => done(new Error('Promise should not resolve for this test without valid job argument.')),
      () => done()
    );
  });

  it('called with non-valid job argument #4, missing data_description', (done) => {
    const job = { analysis_config: {}, datafeed_config: { indices: [] } };
    validateTimeRange(callWithRequestFactory(mockSearchResponse), job).then(
      () => done(new Error('Promise should not resolve for this test without valid job argument.')),
      () => done()
    );
  });

  it('called with non-valid job argument #5, missing data_description.time_field', (done) => {
    const job = { analysis_config: {}, data_description: {}, datafeed_config: { indices: [] } };
    validateTimeRange(callWithRequestFactory(mockSearchResponse), job).then(
      () => done(new Error('Promise should not resolve for this test without valid job argument.')),
      () => done()
    );
  });

  const minimumValidJob = {
    analysis_config: {
      bucket_span: '15m',
      detectors: [],
      influencers: []
    },
    data_description: { time_field: '@timestamp' },
    datafeed_config: {
      indices: []
    }
  };

  it('invalid time field', () => {
    const mockSearchResponseInvalid = _.cloneDeep(mockSearchResponse);
    mockSearchResponseInvalid.fieldCaps = undefined;
    const duration = { start: 0, end: 1 };
    return validateTimeRange(callWithRequestFactory(mockSearchResponseInvalid), minimumValidJob, duration).then(
      (messages) => {
        const ids = messages.map(m => m.id);
        expect(ids).to.eql(['time_field_invalid']);
      }
    );
  });

  it('too short time range, 25x bucket span is less than 2h', () => {
    const jobShortTimeRange = _.cloneDeep(minimumValidJob);
    jobShortTimeRange.analysis_config.bucket_span = '1s';
    const duration = { start: 0, end: 1 };
    return validateTimeRange(callWithRequestFactory(mockSearchResponse), jobShortTimeRange, duration).then(
      (messages) => {
        const ids = messages.map(m => m.id);
        expect(ids).to.eql(['time_range_short']);
      }
    );
  });

  it('too short time range, 25x bucket span is more than 2h', () => {
    const duration = { start: 0, end: 1 };
    return validateTimeRange(callWithRequestFactory(mockSearchResponse), minimumValidJob, duration).then(
      (messages) => {
        const ids = messages.map(m => m.id);
        expect(ids).to.eql(['time_range_short']);
      }
    );
  });

  it('time range between 2h and 25x bucket span', () => {
    const duration = { start: 0, end: 8000000 };
    return validateTimeRange(callWithRequestFactory(mockSearchResponse), minimumValidJob, duration).then(
      (messages) => {
        const ids = messages.map(m => m.id);
        expect(ids).to.eql(['time_range_short']);
      }
    );
  });

  it('valid time range', () => {
    const duration = { start: 0, end: 100000000 };
    return validateTimeRange(callWithRequestFactory(mockSearchResponse), minimumValidJob, duration).then(
      (messages) => {
        const ids = messages.map(m => m.id);
        expect(ids).to.eql(['success_time_range']);
      }
    );
  });

  it('invalid time range, start time is before the UNIX epoch', () => {
    const duration = { start: -1, end: 100000000 };
    return validateTimeRange(callWithRequestFactory(mockSearchResponse), minimumValidJob, duration).then(
      (messages) => {
        const ids = messages.map(m => m.id);
        expect(ids).to.eql(['time_range_before_epoch']);
      }
    );
  });

});
