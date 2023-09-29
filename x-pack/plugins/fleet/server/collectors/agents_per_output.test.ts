/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import { getAgentsPerOutput } from './agents_per_output';

jest.mock('../services', () => {
  return {
    agentPolicyService: {
      list: jest.fn().mockResolvedValue({
        items: [
          { agents: 0, data_output_id: 'logstash1', monitoring_output_id: 'kafka1' },
          { agents: 1 },
          { agents: 1, data_output_id: 'logstash1' },
          { agents: 1, monitoring_output_id: 'kafka1' },
          { agents: 1, data_output_id: 'elasticsearch2', monitoring_output_id: 'elasticsearch2' },
          {
            agents: 1,
            data_output_id: 'es-containerhost',
            monitoring_output_id: 'es-containerhost',
          },
        ],
      }),
    },
    outputService: {
      list: jest.fn().mockResolvedValue({
        items: [
          {
            id: 'default-output',
            is_default: true,
            is_default_monitoring: true,
            type: 'elasticsearch',
          },
          { id: 'logstash1', type: 'logstash' },
          { id: 'kafka1', type: 'kafka' },
          { id: 'elasticsearch2', type: 'elasticsearch' },
          { id: 'es-containerhost', type: 'elasticsearch' },
        ],
      }),
    },
  };
});

describe('agents_per_output', () => {
  const soClientMock = {} as unknown as SavedObjectsClientContract;

  it('should return agent count by output type', async () => {
    const res = await getAgentsPerOutput(soClientMock, {} as unknown as ElasticsearchClient);
    expect(res).toEqual([
      { output_type: 'elasticsearch', count_as_data: 4, count_as_monitoring: 4 },
      { output_type: 'logstash', count_as_data: 1, count_as_monitoring: 0 },
      { output_type: 'kafka', count_as_data: 0, count_as_monitoring: 1 },
    ]);
  });
});
