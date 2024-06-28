/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertToDataStreamFormat } from './convert_to_data_stream';

describe('convertToDataStreamFormat', function () {
  const testConfig = {
    id: 'testId',
    type: 'http',
    enabled: true,
    schedule: '@every 3m',
    'service.name': '',
    tags: [],
    timeout: '16',
    name: 'Test Monitor',
    urls: 'https://www.google.com',
    max_redirects: '0',
    password: '12345678',
    proxy_url: '',
    'check.response.body.negative': [],
    'check.response.body.positive': [],
    'response.include_body': 'on_error',
    'check.response.headers': {},
    'response.include_headers': true,
    'check.response.status': [],
    'check.request.body': { type: 'text', value: '' },
    'check.request.headers': {},
    'check.request.method': 'GET',
    username: '',
  };

  it('parses correctly', function () {
    const result = convertToDataStreamFormat(testConfig);
    expect(result).toEqual({
      data_stream: {
        namespace: 'default',
      },
      enabled: true,
      id: 'testId',
      schedule: '@every 3m',
      streams: [
        {
          'check.request.body': {
            type: 'text',
            value: '',
          },
          'check.request.headers': {},
          'check.request.method': 'GET',
          'check.response.body.negative': [],
          'check.response.body.positive': [],
          'check.response.headers': {},
          'check.response.status': [],
          data_stream: {
            dataset: 'http',
            type: 'synthetics',
          },
          enabled: true,
          id: 'testId',
          max_redirects: '0',
          name: 'Test Monitor',
          password: '12345678',
          proxy_url: '',
          'response.include_body': 'on_error',
          'response.include_headers': true,
          schedule: '@every 3m',
          'service.name': '',
          tags: [],
          timeout: '16',
          type: 'http',
          urls: 'https://www.google.com',
          username: '',
        },
      ],
      type: 'http',
    });
  });
});
