/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLookbackInterval, resolveLookbackInterval } from './alerts';
import type { CombinedJobWithStats, Datafeed, Job } from '../types/anomaly_detection_jobs';

describe('resolveLookbackInterval', () => {
  test('resolves interval for bucket spans bigger than 1m', () => {
    const testJobs = [
      {
        analysis_config: {
          bucket_span: '15m',
        },
      },
    ] as Job[];

    const testDatafeeds = [
      {
        query_delay: '65630ms',
      },
    ] as Datafeed[];

    expect(resolveLookbackInterval(testJobs, testDatafeeds)).toBe('32m');
  });

  test('resolves interval for bucket spans smaller than 1m', () => {
    const testJobs = [
      {
        analysis_config: {
          bucket_span: '50s',
        },
      },
    ] as Job[];

    const testDatafeeds = [
      {
        query_delay: '20s',
      },
    ] as Datafeed[];

    expect(resolveLookbackInterval(testJobs, testDatafeeds)).toBe('3m');
  });

  test('resolves interval for bucket spans smaller than 1m without query dealay', () => {
    const testJobs = [
      {
        analysis_config: {
          bucket_span: '59s',
        },
      },
    ] as Job[];

    const testDatafeeds = [{}] as Datafeed[];

    expect(resolveLookbackInterval(testJobs, testDatafeeds)).toBe('3m');
  });
});

describe('getLookbackInterval', () => {
  test('resolves interval for bucket spans bigger than 1m', () => {
    const testJobs = [
      {
        analysis_config: {
          bucket_span: '15m',
        },
        datafeed_config: {
          query_delay: '65630ms',
        },
      },
    ] as CombinedJobWithStats[];

    expect(getLookbackInterval(testJobs)).toBe('32m');
  });
});
