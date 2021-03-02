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
    opencurly: {{opencurly}}
    closecurly: {{closecurly}}
    opensquare: {{opensquare}}
    closesquare: {{closesquare}}
    ampersand: {{ampersand}}
    asterisk: {{asterisk}}
    question: {{question}}
    pipe: {{pipe}}
    hyphen: {{hyphen}}
    openangle: {{openangle}}
    closeangle: {{closeangle}}
    equals: {{equals}}
    exclamation: {{exclamation}}
    percent: {{percent}}
    at: {{at}}
    colon: {{colon}}
    numeric: {{numeric}}
    mixed: {{mixed}}`;

    // List of special chars that may lead to YAML parsing errors when not quoted.
    // See YAML specification section 5.3 Indicator characters
    // https://yaml.org/spec/1.2/spec.html#id2772075
    // {,},[,],&,*,?,|,-,<,>,=,!,%,@,:
    const vars = {
      opencurly: { value: '{', type: 'string' },
      closecurly: { value: '}', type: 'string' },
      opensquare: { value: '[', type: 'string' },
      closesquare: { value: ']', type: 'string' },
      comma: { value: ',', type: 'string' },
      ampersand: { value: '&', type: 'string' },
      asterisk: { value: '*', type: 'string' },
      question: { value: '?', type: 'string' },
      pipe: { value: '|', type: 'string' },
      hyphen: { value: '-', type: 'string' },
      openangle: { value: '<', type: 'string' },
      closeangle: { value: '>', type: 'string' },
      equals: { value: '=', type: 'string' },
      exclamation: { value: '!', type: 'string' },
      percent: { value: '%', type: 'string' },
      at: { value: '@', type: 'string' },
      colon: { value: ':', type: 'string' },
      numeric: { value: '100', type: 'string' },
      mixed: { value: '1s', type: 'string' },
    };

    const targetOutput = {
      'my-package': {
        opencurly: '{',
        closecurly: '}',
        opensquare: '[',
        closesquare: ']',
        ampersand: '&',
        asterisk: '*',
        question: '?',
        pipe: '|',
        hyphen: '-',
        openangle: '<',
        closeangle: '>',
        equals: '=',
        exclamation: '!',
        percent: '%',
        at: '@',
        colon: ':',
        numeric: '100',
        mixed: '1s',
      },
    };

    const output = compileTemplate(vars, stringTemplate);
    expect(output).toEqual(targetOutput);
  });
});
