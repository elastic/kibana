/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataStream } from '../../../../../../../../../common/types';

import { sortDatastreamsByDataset } from './sort_datastreams';

const ds = (dataset: string) => ({ dataset } as DataStream);
describe('orderDatasets', () => {
  it('should move datasets up that match name', () => {
    const datasets = sortDatastreamsByDataset(
      [ds('system.memory'), ds('elastic_agent'), ds('elastic_agent.filebeat'), ds('system.cpu')],
      'elastic_agent'
    );

    expect(datasets).toEqual([
      ds('elastic_agent'),
      ds('elastic_agent.filebeat'),
      ds('system.cpu'),
      ds('system.memory'),
    ]);
  });

  it('should order alphabetically if name does not match', () => {
    const datasets = sortDatastreamsByDataset([ds('system.memory'), ds('elastic_agent')], 'nginx');

    expect(datasets).toEqual([ds('elastic_agent'), ds('system.memory')]);
  });
});
