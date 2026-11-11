/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toFromSourceQuery } from './to_from_source_query';

describe('toFromSourceQuery', () => {
  it('rewrites a TS source to FROM', () => {
    expect(toFromSourceQuery('TS metrics-*')).toBe('FROM metrics-*');
  });

  it('keeps a CCS FROM source with an exclusion and predicate unchanged', () => {
    const query =
      'FROM metrics-gcp-us-central1:metrics-kubernetes.*, -metrics-gcp-us-central1:metrics-kubernetes.apiserver-* | WHERE orchestrator.cluster.name == "prd-gcpusc1-mki-mgmt-csp"';

    expect(toFromSourceQuery(query)).toBe(query);
  });
});
