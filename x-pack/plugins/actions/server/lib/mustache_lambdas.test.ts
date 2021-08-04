/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Mustache from 'mustache';
import { getMustacheLambdas } from './mustache_lambdas';
import { setGlobalDate } from './tests/fixed_global_date';

const lambdas = getMustacheLambdas();

setGlobalDate();
const globalDate = new Date().toISOString();
const context = {
  date: ` ${globalDate} `,
  text: ` foo  bar `,
  trimmed: `foobar`,
  error: () => {
    throw new Error('test error');
  },
  inner: {
    tags: ['a', 'bb', 'ccc'],
  },
  tags: ['a', 'bb', 'ccc'],
  ...lambdas,
};

describe('mustache_lambdas', () => {
  describe('Trim', () => {
    test('removes leading and trailing blanks but not embedded blanks', () => {
      const template = `{{#Trim}} {{text}} {{/Trim}}`;
      const result = Mustache.render(template, context);
      expect(result).toBe(context.text.trim());
    });

    test('does nothing if no leading or trailing blanks', () => {
      const template = `{{#Trim}}{{trimmed}}{{/Trim}}`;
      const result = Mustache.render(template, context);
      expect(result).toBe(context.trimmed);
    });

    test('returns embedded errors', () => {
      const template = `{{#Trim}} {{error}} {{/Trim}}`;
      const result = Mustache.render(template, context);
      expect(result).toBe('error rendering {{#Trim}} " {{error}} " {{/Trim}}: test error');
    });
  });

  describe('Date', () => {
    test('handles UTC', () => {
      const template = `{{#Date}}{{date}}{{/Date}}`;
      const result = Mustache.render(template, context);
      expect(result).toBe('2019-02-12T21:01:22Z');
    });

    test('handles time zone', () => {
      const template = `{{#Date}} {{date}}  America/New_York {{/Date}}`;
      const result = Mustache.render(template, context);
      expect(result).toBe('2019-02-12T16:01:22-05:00');
    });

    test('handles format', () => {
      const template = `{{#Date}} {{date}} utc MMM Do YYYY {{/Date}}`;
      const result = Mustache.render(template, context);
      expect(result).toBe('Feb 12th 2019');
    });

    test('returns error from rendering text', () => {
      const template = `{{#Date}} {{error}} {{/Date}}`;
      const result = Mustache.render(template, context);
      expect(result).toBe('error rendering {{#Date}} " {{error}} " {{/Date}}: test error');
    });

    test('returns error from bad date', () => {
      const template = `{{#Date}} {{trimmed}} {{/Date}}`;
      const result = Mustache.render(template, context);
      expect(result).toBe(
        'error rendering {{#Date}} " {{trimmed}} " {{/Date}}: error with date "foobar": unable to parse'
      );
    });

    test('returns error from time zone', () => {
      const template = `{{#Date}} {{date}} America/Apex_NC {{/Date}}`;
      const result = Mustache.render(template, context);
      expect(result).toBe(
        'error rendering {{#Date}} " {{date}} America/Apex_NC " {{/Date}}: invalid timezone "America/Apex_NC"'
      );
    });

    // doesn't appear to be an easy way to get a bad format to throw an error
    test('does not return error from bad format', () => {
      const template = `{{#Date}} {{date}} utc utter garbage {{/Date}}`;
      const result = Mustache.render(template, context);
      expect(result).toBe('utt2r gpmrbpmg2');
    });
  });

  describe('JSON', () => {
    test('handles string arrays', () => {
      const template = `{{#JSON}} tags {{/JSON}}`;
      const result = Mustache.render(template, context);
      expect(result).toBe('["a","bb","ccc"]');
    });

    test('does not handle string arrays in an object', () => {
      const template = `{{#JSON}} inner.tags {{/JSON}}`;
      const result = Mustache.render(template, context);
      // fails because we don't interpolate the variable, must be top-level
      expect(result).toBe('"undefined"');
    });

    test('handles string arrays in an object with section unwrapper', () => {
      const template = `{{#inner}} {{#JSON}} tags {{/JSON}} {{/inner}}`;
      const result = Mustache.render(template, context);
      // fails because we don't interpolate the variable, must be top-level
      expect(result).toBe(' ["a","bb","ccc"] ');
    });
  });

  describe('Expr', () => {
    test('handles nothing yet', () => {
      const template = `{{#Expr}} tags {{/Expr}}`;
      const result = Mustache.render(template, context);
      expect(result).toBe(
        'error rendering {{#Expr}} " tags " {{/Expr}}: under construction; would have executed the text as a Kibana expression!'
      );
    });
  });
});
