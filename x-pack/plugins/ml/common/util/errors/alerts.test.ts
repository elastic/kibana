/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLookbackInterval } from '../alerts';
import type { CombinedJobWithStats } from '../../types/anomaly_detection_jobs';

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

    expect(getLookbackInterval(testJobs)).toBe(1867);
  });
  test('resolves interval for bucket spans smaller than 1m', () => {
    const testJobs = [
      {
        analysis_config: {
          bucket_span: '50s',
        },
        datafeed_config: {
          query_delay: '20s',
        },
      },
    ] as CombinedJobWithStats[];

    expect(getLookbackInterval(testJobs)).toBe(141);
  });
  test('resolves interval for bucket spans smaller than 1m without query dealay', () => {
    const testJobs = [
      {
        analysis_config: {
          bucket_span: '59s',
        },
        datafeed_config: {},
      },
    ] as CombinedJobWithStats[];

    expect(getLookbackInterval(testJobs)).toBe(121);
  });
});
