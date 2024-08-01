/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createDatasetMatcher } from './create_dataset_matcher';

describe('dataset matcher', () => {
  function match(pattern: string, dataset: string) {
    return createDatasetMatcher(pattern, false).match(dataset);
  }

  it('matches local patterns with local datasets', () => {
    expect(match('*', 'logs.default')).toBe(true);
    expect(match('*', 'logging:logs.default')).toBe(false);
    expect(match('logs*', 'logs.default')).toBe(true);

    expect(match('-logs*', 'logs.default')).toBe(false);
    expect(match('-logs*', 'nologs')).toBe(true);
  });

  it('matches remote patterns with remote datasets or remotes only', () => {
    expect(match('logging*', 'logging-eu-west1:logs')).toBe(false);
    expect(match('logging*:*', 'logging-eu-west1:logs')).toBe(true);
    expect(match('logging*:-logs*', 'logging-eu-west1:logs')).toBe(false);
    expect(match('logging*:-logs*', 'logging-eu-west1:apm')).toBe(true);

    expect(
      match('metrics-*:-metrics-apm*', 'metrics-eu-west-1:metrics-apm.app.firehose_service-default')
    );
  });
});
