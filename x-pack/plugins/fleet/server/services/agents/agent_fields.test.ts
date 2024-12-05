/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAgentFields } from './agent_fields';

describe('getAgentFields', () => {
  it('should return array of fields from agents index mappings', async () => {
    const esClient = {
      indices: {
        getMapping: jest.fn().mockResolvedValue({
          '.fleet-agents-7': {
            mappings: {
              properties: {
                agent: {
                  properties: {
                    id: {},
                  },
                },
                status: {},
                local_metadata: {
                  properties: {
                    elastic: {
                      properties: {
                        agent: {
                          properties: {
                            version: {},
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        }),
      },
    };
    const result = await getAgentFields(esClient as any);
    expect(result).toEqual([
      { field: 'agent.id' },
      { field: 'status' },
      { field: 'local_metadata.elastic.agent.version' },
    ]);
  });
});
