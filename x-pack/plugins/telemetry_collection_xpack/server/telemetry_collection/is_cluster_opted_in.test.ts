/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isClusterOptedIn } from './is_cluster_opted_in';

const createMockClusterUsage = (plugins: any) => {
  return {
    stack_stats: {
      kibana: { plugins },
    },
  };
};

describe('isClusterOptedIn', () => {
  it('returns true if cluster has opt_in_status: true', () => {
    const mockClusterUsage = createMockClusterUsage({ telemetry: { opt_in_status: true } });
    const result = isClusterOptedIn(mockClusterUsage);
    expect(result).toBe(true);
  });
  it('returns false if cluster has opt_in_status: false', () => {
    const mockClusterUsage = createMockClusterUsage({ telemetry: { opt_in_status: false } });
    const result = isClusterOptedIn(mockClusterUsage);
    expect(result).toBe(false);
  });
  it('returns false if cluster has opt_in_status: undefined', () => {
    const mockClusterUsage = createMockClusterUsage({ telemetry: {} });
    const result = isClusterOptedIn(mockClusterUsage);
    expect(result).toBe(false);
  });
  it('returns true if kibana.plugins.telemetry does not exist', () => {
    expect(isClusterOptedIn(createMockClusterUsage({}))).toBe(true);
    expect(isClusterOptedIn({})).toBe(true);
    expect(isClusterOptedIn(undefined)).toBe(true);
  });
});
