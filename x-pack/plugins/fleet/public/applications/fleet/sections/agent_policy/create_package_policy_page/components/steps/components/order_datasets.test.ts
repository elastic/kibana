/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { orderDatasets } from './order_datasets';

describe('orderDatasets', () => {
  it('should move datasets up that match name', () => {
    const datasets = orderDatasets(
      ['system.memory', 'elastic_agent', 'elastic_agent.filebeat', 'system.cpu'],
      'elastic_agent'
    );

    expect(datasets).toEqual([
      'elastic_agent',
      'elastic_agent.filebeat',
      'system.cpu',
      'system.memory',
    ]);
  });

  it('should order alphabetically if name does not match', () => {
    const datasets = orderDatasets(['system.memory', 'elastic_agent'], 'nginx');

    expect(datasets).toEqual(['elastic_agent', 'system.memory']);
  });
});
