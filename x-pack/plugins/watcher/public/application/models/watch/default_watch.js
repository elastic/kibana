/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const defaultWatch = {
  trigger: {
    schedule: {
      interval: '30m',
    },
  },
  input: {
    search: {
      request: {
        body: {
          size: 0,
          query: {
            match_all: {},
          },
        },
        indices: ['*'],
      },
    },
  },
  condition: {
    compare: {
      'ctx.payload.hits.total': {
        gte: 10,
      },
    },
  },
  actions: {
    'my-logging-action': {
      logging: {
        text: 'There are {{ctx.payload.hits.total}} documents in your index. Threshold is 10.',
      },
    },
  },
};
