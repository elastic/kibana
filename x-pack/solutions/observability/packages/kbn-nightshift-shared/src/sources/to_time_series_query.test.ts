/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toTimeSeriesSourceQuery } from './to_time_series_query';

describe('toTimeSeriesSourceQuery', () => {
  it('rewrites a FROM source', () => {
    expect(toTimeSeriesSourceQuery('FROM metrics-*')).toBe('TS metrics-*');
  });

  it('preserves remote patterns, exclusions, and predicates', () => {
    const query =
      'FROM metrics-gcp-us-central1:metrics-kubernetes.*,-metrics-gcp-us-central1:metrics-kubernetes.apiserver-* | WHERE orchestrator.cluster.name == "prd-gcpusc1-mki-mgmt-csp"';

    expect(toTimeSeriesSourceQuery(query)).toBe(
      'TS metrics-gcp-us-central1:metrics-kubernetes.*, -metrics-gcp-us-central1:metrics-kubernetes.apiserver-* | WHERE orchestrator.cluster.name == "prd-gcpusc1-mki-mgmt-csp"'
    );
  });

  it('keeps a TS source as TS', () => {
    expect(toTimeSeriesSourceQuery('TS metrics-* | WHERE host.name == "server-1"')).toBe(
      'TS metrics-* | WHERE host.name == "server-1"'
    );
  });
});
