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
  - !!str {{this}}
{{/each}}
      `;
    const vars = {
      paths: { value: ['/usr/local/var/log/nginx/access.log'] },
      password: { type: 'password', value: '' },
      optional_field: { type: 'text', value: undefined },
      bar: { type: 'text', value: 'bar' },
      should_be_text: { type: 'text', value: 'textvalue' },
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
      some_text_field: 'textvalue',
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
{{#if emptyfield}}
emptyfield: {{emptyfield}}
{{/if}}
{{#if nullfield}}
nullfield: {{nullfield}}
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
      emptyfield: { type: 'yaml', value: '' },
      nullfield: { type: 'yaml' },
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
    const streamTemplateWithString = `
{{#if (contains ".pcap" file)}}
pcap: true
{{else}}
pcap: false
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

    it('should support strings', () => {
      const vars = {
        file: { value: 'foo.pcap' },
      };

      const output = compileTemplate(vars, streamTemplateWithString);
      expect(output).toEqual({
        pcap: true,
      });
    });

    it('should support strings with no match', () => {
      const vars = {
        file: { value: 'file' },
      };

      const output = compileTemplate(vars, streamTemplateWithString);
      expect(output).toEqual({
        pcap: false,
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

  it('should suport !!str for string values', () => {
    const stringTemplate = `
my-package:
    asteriskOnly: {{asteriskOnly}}
    startsWithAsterisk: {{startsWithAsterisk}}
    numeric_with_str: !!str {{numeric}}
    numeric_without_str: {{numeric}}
    mixed: {{mixed}}
    concatenatedEnd: {{a}}{{b}}
    concatenatedMiddle: {{c}}{{d}}
    mixedMultiline: |-
        {{{ search }}} | streamstats`;

    const vars = {
      asteriskOnly: { value: '"*"', type: 'text' },
      startsWithAsterisk: { value: '"*lala"', type: 'text' },
      numeric: { value: '100', type: 'text' },
      mixed: { value: '1s', type: 'text' },
      a: { value: '/opt/package/*', type: 'text' },
      b: { value: '/logs/my.log*', type: 'text' },
      c: { value: '/opt/*/package/', type: 'text' },
      d: { value: 'logs/*my.log', type: 'text' },
      search: { value: 'search sourcetype="access*"', type: 'text' },
    };

    const targetOutput = {
      'my-package': {
        asteriskOnly: '*',
        startsWithAsterisk: '*lala',
        numeric_with_str: '100',
        numeric_without_str: 100,
        mixed: '1s',
        concatenatedEnd: '/opt/package/*/logs/my.log*',
        concatenatedMiddle: '/opt/*/package/logs/*my.log',
        mixedMultiline: 'search sourcetype="access*" | streamstats',
      },
    };

    const output = compileTemplate(vars, stringTemplate);
    expect(output).toEqual(targetOutput);
  });

  it('should throw on invalid handlebar template', () => {
    const streamTemplate = `
input: log
paths:
{{ if test}}
  - {{ test}}
{{ end }}
`;
    const vars = {};

    expect(() => compileTemplate(vars, streamTemplate)).toThrowError(
      'Error while compiling agent template: options.inverse is not a function'
    );
  });
});
