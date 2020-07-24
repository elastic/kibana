/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';

import { ILegacyScopedClusterClient } from 'kibana/server';

import { CombinedJob } from '../../../common/types/anomaly_detection_jobs';

import { isValidTimeField, validateTimeRange } from './validate_time_range';

import mockTimeField from './__mocks__/mock_time_field.json';
import mockTimeFieldNested from './__mocks__/mock_time_field_nested.json';
import mockTimeRange from './__mocks__/mock_time_range.json';

const mockSearchResponse = {
  fieldCaps: mockTimeField,
  search: mockTimeRange,
};

const mlClusterClientFactory = (resp: any): ILegacyScopedClusterClient => {
  const callAs = (path: string) => {
    return new Promise((resolve) => {
      resolve(resp[path]);
    }) as Promise<any>;
  };
  return {
    callAsCurrentUser: callAs,
    callAsInternalUser: callAs,
  };
};

function getMinimalValidJob() {
  return ({
    analysis_config: {
      bucket_span: '15m',
      detectors: [],
      influencers: [],
    },
    data_description: { time_field: '@timestamp' },
    datafeed_config: {
      indices: [],
    },
  } as unknown) as CombinedJob;
}

describe('ML - isValidTimeField', () => {
  it('called without job config argument triggers Promise rejection', (done) => {
    isValidTimeField(
      mlClusterClientFactory(mockSearchResponse),
      (undefined as unknown) as CombinedJob
    ).then(
      () => done(new Error('Promise should not resolve for this test without job argument.')),
      () => done()
    );
  });

  it('time_field `@timestamp`', (done) => {
    isValidTimeField(mlClusterClientFactory(mockSearchResponse), getMinimalValidJob()).then(
      (valid) => {
        expect(valid).toBe(true);
        done();
      },
      () => done(new Error('isValidTimeField Promise failed for time_field `@timestamp`.'))
    );
  });

  it('time_field `metadata.timestamp`', (done) => {
    const mockJobConfigNestedDate = getMinimalValidJob();
    mockJobConfigNestedDate.data_description.time_field = 'metadata.timestamp';

    const mockSearchResponseNestedDate = {
      fieldCaps: mockTimeFieldNested,
      search: mockTimeRange,
    };

    isValidTimeField(
      mlClusterClientFactory(mockSearchResponseNestedDate),
      mockJobConfigNestedDate
    ).then(
      (valid) => {
        expect(valid).toBe(true);
        done();
      },
      () => done(new Error('isValidTimeField Promise failed for time_field `metadata.timestamp`.'))
    );
  });
});

describe('ML - validateTimeRange', () => {
  it('called without arguments', (done) => {
    validateTimeRange(
      mlClusterClientFactory(mockSearchResponse),
      (undefined as unknown) as CombinedJob
    ).then(
      () => done(new Error('Promise should not resolve for this test without job argument.')),
      () => done()
    );
  });

  it('called with non-valid job argument #2, missing datafeed_config', (done) => {
    validateTimeRange(mlClusterClientFactory(mockSearchResponse), ({
      analysis_config: {},
    } as unknown) as CombinedJob).then(
      () => done(new Error('Promise should not resolve for this test without valid job argument.')),
      () => done()
    );
  });

  it('called with non-valid job argument #3, missing datafeed_config.indices', (done) => {
    const job = { analysis_config: {}, datafeed_config: {} };
    validateTimeRange(
      mlClusterClientFactory(mockSearchResponse),
      (job as unknown) as CombinedJob
    ).then(
      () => done(new Error('Promise should not resolve for this test without valid job argument.')),
      () => done()
    );
  });

  it('called with non-valid job argument #4, missing data_description', (done) => {
    const job = { analysis_config: {}, datafeed_config: { indices: [] } };
    validateTimeRange(
      mlClusterClientFactory(mockSearchResponse),
      (job as unknown) as CombinedJob
    ).then(
      () => done(new Error('Promise should not resolve for this test without valid job argument.')),
      () => done()
    );
  });

  it('called with non-valid job argument #5, missing data_description.time_field', (done) => {
    const job = { analysis_config: {}, data_description: {}, datafeed_config: { indices: [] } };
    validateTimeRange(
      mlClusterClientFactory(mockSearchResponse),
      (job as unknown) as CombinedJob
    ).then(
      () => done(new Error('Promise should not resolve for this test without valid job argument.')),
      () => done()
    );
  });

  it('invalid time field', () => {
    const mockSearchResponseInvalid = _.cloneDeep(mockSearchResponse);
    mockSearchResponseInvalid.fieldCaps = undefined;
    const duration = { start: 0, end: 1 };
    return validateTimeRange(
      mlClusterClientFactory(mockSearchResponseInvalid),
      getMinimalValidJob(),
      duration
    ).then((messages) => {
      const ids = messages.map((m) => m.id);
      expect(ids).toStrictEqual(['time_field_invalid']);
    });
  });

  it('too short time range, 25x bucket span is less than 2h', () => {
    const jobShortTimeRange = getMinimalValidJob();
    jobShortTimeRange.analysis_config.bucket_span = '1s';
    const duration = { start: 0, end: 1 };
    return validateTimeRange(
      mlClusterClientFactory(mockSearchResponse),
      jobShortTimeRange,
      duration
    ).then((messages) => {
      const ids = messages.map((m) => m.id);
      expect(ids).toStrictEqual(['time_range_short']);
    });
  });

  it('too short time range, 25x bucket span is more than 2h', () => {
    const duration = { start: 0, end: 1 };
    return validateTimeRange(
      mlClusterClientFactory(mockSearchResponse),
      getMinimalValidJob(),
      duration
    ).then((messages) => {
      const ids = messages.map((m) => m.id);
      expect(ids).toStrictEqual(['time_range_short']);
    });
  });

  it('time range between 2h and 25x bucket span', () => {
    const duration = { start: 0, end: 8000000 };
    return validateTimeRange(
      mlClusterClientFactory(mockSearchResponse),
      getMinimalValidJob(),
      duration
    ).then((messages) => {
      const ids = messages.map((m) => m.id);
      expect(ids).toStrictEqual(['time_range_short']);
    });
  });

  it('valid time range', () => {
    const duration = { start: 0, end: 100000000 };
    return validateTimeRange(
      mlClusterClientFactory(mockSearchResponse),
      getMinimalValidJob(),
      duration
    ).then((messages) => {
      const ids = messages.map((m) => m.id);
      expect(ids).toStrictEqual(['success_time_range']);
    });
  });

  it('invalid time range, start time is before the UNIX epoch', () => {
    const duration = { start: -1, end: 100000000 };
    return validateTimeRange(
      mlClusterClientFactory(mockSearchResponse),
      getMinimalValidJob(),
      duration
    ).then((messages) => {
      const ids = messages.map((m) => m.id);
      expect(ids).toStrictEqual(['time_range_before_epoch']);
    });
  });
});
