/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const wiredStreamConfig = {
  ingest: {
    lifecycle: { dsl: { data_retention: '7d' } },
    processing: [
      {
        config: {
          grok: {
            field: 'message',
            patterns: ['%{TIMESTAMP_ISO8601:event.timestamp} %{GREEDY:rest}'],
          },
        },
        condition: {
          field: 'log.level',
          operator: 'eq',
          value: 'error',
        },
      },
    ],
    routing: [
      {
        name: 'logs.errors',
        condition: {
          field: 'log.level',
          operator: 'eq',
          value: 'error',
        },
      },
    ],
    wired: {
      fields: {
        new_field: {
          type: 'long',
        },
      },
    },
  },
};
