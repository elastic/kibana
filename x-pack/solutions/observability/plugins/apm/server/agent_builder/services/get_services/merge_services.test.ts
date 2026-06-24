/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeServices } from './merge_services';
import type { GetServicesItem } from './types';
import type { ServiceFromIndex } from './get_services_from_logs_and_metrics_indices';

describe('mergeServices', () => {
  it('returns APM services when no logs/metrics services', () => {
    const apmServices: GetServicesItem[] = [
      { serviceName: 'checkout', latency: 100, throughput: 50 },
    ];
    const result = mergeServices({ apmServices, logsAndMetricsServices: [] });
    expect(result).toEqual(apmServices);
  });

  it('returns logs/metrics services when no APM services', () => {
    const logsAndMetricsServices: ServiceFromIndex[] = [
      { serviceName: 'worker', environment: 'production' },
    ];
    const result = mergeServices({ apmServices: [], logsAndMetricsServices });
    expect(result).toEqual([{ serviceName: 'worker', environments: ['production'] }]);
  });

  it('adds logs/metrics services not present in APM', () => {
    const apmServices: GetServicesItem[] = [{ serviceName: 'checkout', latency: 100 }];
    const logsAndMetricsServices: ServiceFromIndex[] = [{ serviceName: 'worker' }];
    const result = mergeServices({ apmServices, logsAndMetricsServices });
    expect(result).toHaveLength(2);
    expect(result.find((s) => s.serviceName === 'worker')).toBeDefined();
  });

  it('APM service takes precedence over logs/metrics service with same name', () => {
    const apmServices: GetServicesItem[] = [
      { serviceName: 'checkout', latency: 100, throughput: 50 },
    ];
    const logsAndMetricsServices: ServiceFromIndex[] = [
      { serviceName: 'checkout', environment: 'production' },
    ];
    const result = mergeServices({ apmServices, logsAndMetricsServices });
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(apmServices[0]);
  });

  it('deduplicates by serviceName only — same service in different environments is treated as one', () => {
    // This documents a known limitation: if "checkout" exists in APM for prod
    // but only in logs for staging, the staging entry is dropped.
    const apmServices: GetServicesItem[] = [
      { serviceName: 'checkout', environments: ['production'] },
    ];
    const logsAndMetricsServices: ServiceFromIndex[] = [
      { serviceName: 'checkout', environment: 'staging' },
    ];
    const result = mergeServices({ apmServices, logsAndMetricsServices });
    expect(result).toHaveLength(1);
    expect(result[0].environments).toEqual(['production']);
  });

  it('sets environments to undefined when log/metrics service has no environment', () => {
    const logsAndMetricsServices: ServiceFromIndex[] = [{ serviceName: 'worker' }];
    const result = mergeServices({ apmServices: [], logsAndMetricsServices });
    expect(result[0].environments).toBeUndefined();
  });

  it('returns empty array when both inputs are empty', () => {
    expect(mergeServices({ apmServices: [], logsAndMetricsServices: [] })).toEqual([]);
  });
});
