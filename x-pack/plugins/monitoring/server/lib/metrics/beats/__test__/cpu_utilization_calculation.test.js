/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BeatsCpuUtilizationMetric } from '../classes';

describe('Beats CPU Utilization Metric', () => {
  it('should return null for invalid bucket input', () => {
    const myUtilizationMetric = new BeatsCpuUtilizationMetric({
      field: 'beats_cpu_utilization',
      label: 'stats.cpu.value',
      description: 'cpu_description',
      uuidField: 'cluster_uuid',
      timestampField: 'timestamp',
    });

    expect(myUtilizationMetric.calculation()).toBe(null);
  });

  it('should return null for negative deriv normalized_value', () => {
    const myUtilizationMetric = new BeatsCpuUtilizationMetric({
      field: 'beats_cpu_utilization',
      label: 'stats.cpu.value',
      description: 'cpu_description',
      uuidField: 'cluster_uuid',
      timestampField: 'timestamp',
    });

    const bucket = {
      metric_deriv: { normalized_value: -33 },
    };
    expect(myUtilizationMetric.calculation(bucket)).toBe(null);
  });

  it('should return null for null deriv normalized_value', () => {
    const myUtilizationMetric = new BeatsCpuUtilizationMetric({
      field: 'beats_cpu_utilization',
      label: 'stats.cpu.value',
      description: 'cpu_description',
      uuidField: 'cluster_uuid',
      timestampField: 'timestamp',
    });

    const bucket = {
      metric_deriv: { normalized_value: -33 },
    };
    expect(myUtilizationMetric.calculation(bucket)).toBe(null);
  });

  it('should return 0 for 0 deriv value', () => {
    const myUtilizationMetric = new BeatsCpuUtilizationMetric({
      field: 'beats_cpu_utilization',
      label: 'stats.cpu.value',
      description: 'cpu_description',
      uuidField: 'cluster_uuid',
      timestampField: 'timestamp',
    });

    const bucket = {
      metric_deriv: { value: -33 },
    };
    expect(myUtilizationMetric.calculation(bucket)).toBe(null);
  });

  it('should return gt 0 for gt 0 deriv value', () => {
    const myUtilizationMetric = new BeatsCpuUtilizationMetric({
      field: 'beats_cpu_utilization',
      label: 'stats.cpu.value',
      description: 'cpu_description',
      uuidField: 'cluster_uuid',
      timestampField: 'timestamp',
    });

    const bucket = {
      metric_deriv: { value: 33 },
    };
    expect(myUtilizationMetric.calculation(bucket, null, null, 30)).toBe(0.11);
  });
});
