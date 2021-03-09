/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compileTemplate } from './agent';

describe('compileTemplate', () => {
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
password: {{password}}
{{#if password}}
hidden_password: {{password}}
{{/if}}
{{#if optional_field}}
optional_field: {{optional_field}}
{{/if}}
foo: {{bar}}
some_text_field: {{should_be_text}}
multi_text_field:
{{#each multi_text}}
  - {{this}}
{{/each}}
      `;
    const vars = {
      paths: { value: ['/usr/local/var/log/nginx/access.log'] },
      password: { type: 'password', value: '' },
      optional_field: { type: 'text', value: undefined },
      bar: { type: 'text', value: 'bar' },
      should_be_text: { type: 'text', value: '1234' },
      multi_text: { type: 'text', value: ['1234', 'foo', 'bar'] },
    };

    const output = compileTemplate(vars, streamTemplate);
    expect(output).toEqual({
      input: 'log',
      paths: ['/usr/local/var/log/nginx/access.log'],
      exclude_files: ['.gz$'],
      processors: [{ add_locale: null }],
      password: '',
      foo: 'bar',
      some_text_field: '1234',
      multi_text_field: ['1234', 'foo', 'bar'],
    });
  });

  it('should support yaml values', () => {
    const streamTemplate = `
input: redis/metrics
metricsets: ["key"]
test: null
password: {{password}}
{{custom}}
custom: {{ custom }}
{{#if key.patterns}}
key.patterns: {{key.patterns}}
{{/if}}
{{ testEmpty }}
      `;
    const vars = {
      'key.patterns': {
        type: 'yaml',
        value: `
        - limit: 20
          pattern: '*'
        `,
      },
      custom: {
        type: 'yaml',
        value: `
foo: bar
        `,
      },
      password: { type: 'password', value: '' },
    };

    const output = compileTemplate(vars, streamTemplate);
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
      password: '',
      foo: 'bar',
      custom: { foo: 'bar' },
    });
  });

  describe('contains blocks', () => {
    const streamTemplate = `
input: log
paths:
{{#each paths}}
  - {{this}}
{{/each}}
exclude_files: [".gz$"]
tags:
{{#each tags}}
  - {{this}}
{{/each}}
{{#contains "forwarded" tags}}
publisher_pipeline.disable_host: true
{{/contains}}
processors:
  - add_locale: ~
password: {{password}}
{{#if password}}
hidden_password: {{password}}
{{/if}}
      `;

    it('should support when a value is not contained in the array', () => {
      const vars = {
        paths: { value: ['/usr/local/var/log/nginx/access.log'] },
        password: { type: 'password', value: '' },
        tags: { value: ['foo', 'bar', 'forwarded'] },
      };

      const output = compileTemplate(vars, streamTemplate);
      expect(output).toEqual({
        input: 'log',
        paths: ['/usr/local/var/log/nginx/access.log'],
        exclude_files: ['.gz$'],
        processors: [{ add_locale: null }],
        password: '',
        'publisher_pipeline.disable_host': true,
        tags: ['foo', 'bar', 'forwarded'],
      });
    });

    it('should support when a value is contained in the array', () => {
      const vars = {
        paths: { value: ['/usr/local/var/log/nginx/access.log'] },
        password: { type: 'password', value: '' },
        tags: { value: ['foo', 'bar'] },
      };

      const output = compileTemplate(vars, streamTemplate);
      expect(output).toEqual({
        input: 'log',
        paths: ['/usr/local/var/log/nginx/access.log'],
        exclude_files: ['.gz$'],
        processors: [{ add_locale: null }],
        password: '',
        tags: ['foo', 'bar'],
      });
    });
  });

  it('should support optional yaml values at root level', () => {
    const streamTemplate = `
input: logs
{{custom}}
    `;
    const vars = {
      custom: {
        type: 'yaml',
        value: null,
      },
    };

    const output = compileTemplate(vars, streamTemplate);
    expect(output).toEqual({
      input: 'logs',
    });
  });

  it('should escape string values when necessary', () => {
    const stringTemplate = `
my-package:
    asteriskOnly: {{asteriskOnly}}
    startsWithAsterisk: {{startsWithAsterisk}}
    numeric: {{numeric}}
    mixed: {{mixed}}
    concatenatedEnd: {{a}}{{b}}
    concatenatedMiddle: {{c}}{{d}}
    mixedMultiline: |-
        {{{ search }}} | streamstats`;

    const vars = {
      asteriskOnly: { value: '"*"', type: 'string' },
      startsWithAsterisk: { value: '"*lala"', type: 'string' },
      numeric: { value: '100', type: 'string' },
      mixed: { value: '1s', type: 'string' },
      a: { value: '/opt/package/*', type: 'string' },
      b: { value: '/logs/my.log*', type: 'string' },
      c: { value: '/opt/*/package/', type: 'string' },
      d: { value: 'logs/*my.log', type: 'string' },
      search: { value: 'search sourcetype="access*"', type: 'text' },
    };

    const targetOutput = {
      'my-package': {
        asteriskOnly: '*',
        startsWithAsterisk: '*lala',
        numeric: '100',
        mixed: '1s',
        concatenatedEnd: '/opt/package/*/logs/my.log*',
        concatenatedMiddle: '/opt/*/package/logs/*my.log',
        mixedMultiline: 'search sourcetype="access*" | streamstats',
      },
    };

    const output = compileTemplate(vars, stringTemplate);
    expect(output).toEqual(targetOutput);
  });
});
