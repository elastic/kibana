/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const painlessErrReq = {
  params: {
    index: 'log*',
    body: {
      size: 500,
      fields: ['*'],
      script_fields: {
        invalid_scripted_field: {
          script: {
            source: 'invalid',
            lang: 'painless',
          },
        },
      },
      stored_fields: ['*'],
      query: {
        bool: {
          filter: [
            {
              match_all: {},
            },
            {
              range: {
                '@timestamp': {
                  gte: '2015-01-19T12:27:55.047Z',
                  lte: '2021-01-19T12:27:55.047Z',
                  format: 'strict_date_optional_time',
                },
              },
            },
          ],
        },
      },
    },
  },
};
