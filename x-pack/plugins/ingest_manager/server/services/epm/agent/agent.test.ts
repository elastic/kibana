/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createStream } from './agent';

describe('createStream', () => {
  it('should work', () => {
    const streamTemplate = `
    input: log
    paths:
    {{#each paths}}
      - {{this}}
    {{/each}}
    exclude_files: [".gz$"]
    processors:
      - add_locale: ~
      `;
    const vars = {
      paths: { value: ['/usr/local/var/log/nginx/access.log'] },
    };

    const output = createStream(vars, streamTemplate);
    expect(output).toEqual({
      input: 'log',
      paths: ['/usr/local/var/log/nginx/access.log'],
      exclude_files: ['.gz$'],
      processors: [{ add_locale: null }],
    });
  });

  it('should support yaml values', () => {
    const streamTemplate = `
    input: redis/metrics
    metricsets: ["key"]
    test: null
    {{#if key.patterns}}
    key.patterns: {{key.patterns}}
    {{/if}}
      `;
    const vars = {
      'key.patterns': {
        type: 'yaml',
        value: `
        - limit: 20
          pattern: '*'
        `,
      },
    };

    const output = createStream(vars, streamTemplate);
    expect(output).toEqual({
      input: 'redis/metrics',
      metricsets: ['key'],
      test: null,
      'key.patterns': [
        {
          limit: 20,
          pattern: '*',
        },
      ],
    });
  });
});
