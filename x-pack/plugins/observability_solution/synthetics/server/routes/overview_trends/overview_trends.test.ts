/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapQueryResponse } from './overview_trends';

describe('mapQueryResponse', () => {
  it('should correctly map the response when provided with valid input', () => {
    const response = {
      aggregations: {
        byId: {
          buckets: [
            {
              key: 'config1',
              byLocation: {
                buckets: [
                  {
                    key: 'location1',
                    last50: {
                      buckets: [{ max: { value: 10 } }, { max: { value: 20 } }],
                    },
                    stats: { average: 15 },
                    median: { values: { '50.0': 18 } },
                  },
                ],
              },
            },
          ],
        },
      },
    };

    const expectedOutput = [
      {
        config1location1: {
          configId: 'config1',
          locationId: 'location1',
          data: [
            { x: 0, y: 10 },
            { x: 1, y: 20 },
          ],
          average: 15,
          median: 18,
        },
      },
    ];

    expect(mapQueryResponse(response)).toEqual(expectedOutput);
  });

  it('should handle multiple locations correctly', () => {
    const response = {
      aggregations: {
        byId: {
          buckets: [
            {
              key: 'config1',
              byLocation: {
                buckets: [
                  {
                    key: 'location1',
                    last50: {
                      buckets: [{ max: { value: 10 } }],
                    },
                    stats: { average: 10 },
                    median: { values: { '50.0': 12 } },
                  },
                  {
                    key: 'location2',
                    last50: {
                      buckets: [{ max: { value: 30 } }],
                    },
                    stats: { average: 30 },
                    median: { values: { '50.0': 28 } },
                  },
                ],
              },
            },
          ],
        },
      },
    };

    const expectedOutput = [
      {
        config1location1: {
          configId: 'config1',
          locationId: 'location1',
          data: [{ x: 0, y: 10 }],
          average: 10,
          median: 12,
        },
        config1location2: {
          configId: 'config1',
          locationId: 'location2',
          data: [{ x: 0, y: 30 }],
          average: 30,
          median: 28,
        },
      },
    ];

    expect(mapQueryResponse(response)).toEqual(expectedOutput);
  });

  it('should handle empty buckets gracefully', () => {
    const response = {
      aggregations: {
        byId: {
          buckets: [
            {
              key: 'config1',
              byLocation: {
                buckets: [],
              },
            },
          ],
        },
      },
    };

    const expectedOutput = [{}];

    expect(mapQueryResponse(response)).toEqual(expectedOutput);
  });

  it('should handle missing "last50" or "stats" gracefully', () => {
    const response = {
      aggregations: {
        byId: {
          buckets: [
            {
              key: 'config1',
              byLocation: {
                buckets: [
                  {
                    key: 'location1',
                    last50: {
                      buckets: [],
                    },
                    stats: {},
                    median: { values: { '50.0': 12 } },
                  },
                ],
              },
            },
          ],
        },
      },
    };

    const expectedOutput = [
      {
        config1location1: {
          configId: 'config1',
          locationId: 'location1',
          data: [],
          median: 12,
        },
      },
    ];

    expect(mapQueryResponse(response)).toEqual(expectedOutput);
  });
});
