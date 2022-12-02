/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';

import { renderMustacheString } from './mustache_renderer';

describe('template_renderer', () => {
  describe('using mustache', () => {
    // -------------------------------------------------------------------
    it('has a date helper', () => {
      const timeStamp = '2022-11-29T15:52:44Z';
      const template = dedent`
        {{!@ format: mustache}}
        {{#formatDate}} {{timeStamp}} {{/formatDate}}
      `.trim();

      expect(renderMustacheString(template, { timeStamp }, 'none')).toEqual('2022-11-29 03:52pm');
    });

    // -------------------------------------------------------------------
    it('date with a time zone is successful', () => {
      const timeStamp = '2022-11-29T15:52:44Z';
      const timeZone = 'America/New_York';
      const template = dedent`
        {{!@ format: mustache}}
        {{#formatDate}} {{timeStamp}} ${timeZone} {{/formatDate}}
      `.trim();

      expect(renderMustacheString(template, { timeStamp }, 'none')).toEqual('2022-11-29 10:52am');
    });

    // -------------------------------------------------------------------
    it('date with a format and timezone is successful', () => {
      const timeStamp = '2022-11-29T15:52:44Z';
      const dateFormat = 'dddd MMM Do YYYY HH:mm:ss.SSS';
      const timeZone = 'America/New_York';
      const template = dedent`
        {{!@ format: mustache}}
        {{#formatDate}}{{timeStamp}} ${timeZone} ${dateFormat}{{/formatDate}}
    `.trim();

      expect(renderMustacheString(template, { timeStamp }, 'none')).toEqual(
        'Tuesday Nov 29th 2022 10:52:44.000'
      );
    });

    // -------------------------------------------------------------------
    it('json is successful', () => {
      const vars = {
        context: {
          a: {
            b: 1,
          },
          c: {
            d: 2,
          },
        },
      };
      const template = dedent`
        {{!@ format: mustache}}
        {{#formatJson}} {{context}} {{/formatJson}}
    `.trim();

      expect(renderMustacheString(template, vars, 'none')).toEqual('{"a":{"b":1},"c":{"d":2}}');
    });

    // -------------------------------------------------------------------
    it.failing('json with arrays works', () => {
      const vars = {
        context: {
          arr: [17, 42],
        },
      };
      const template = dedent`
        {{!@ format: mustache}}
        {{#formatJson}}{{context.arr}}{{/formatJson}}
    `.trim();

      expect(renderMustacheString(template, vars, 'none')).toEqual('[17,42]');

      // arrays to JSON doesn't work with mustache due to legacy toString
      // support in the JS arrays
      const template2 = dedent`
        {{!@ format: mustache}}
        {{context.arr}}
        `.trim();

      expect(renderMustacheString(template2, vars, 'none')).toEqual('17,42');
    });

    // -------------------------------------------------------------------
    it('jsonl is successful', () => {
      const vars = {
        context: {
          a: {
            b: 1,
          },
          c: {
            d: 2,
          },
        },
      };
      const template = dedent`
  {{!@ format: mustache}}
  {{#formatJsonl}} {{context}} {{/formatJsonl}}
    `.trim();

      expect(renderMustacheString(template, vars, 'none')).toEqual(`{
    "a": {
        "b": 1
    },
    "c": {
        "d": 2
    }
}`);
    });

    // -------------------------------------------------------------------
    it('math is successful', () => {
      const vars = {
        context: {
          a: { b: 1 },
          c: { d: 2 },
        },
      };
      const template = dedent`
        {{!@ format: mustache}}
        {{#evalMath}} 1 + 0 {{/evalMath}}
        {{#evalMath}} 1 + {{context.a.b}} {{/evalMath}}
        {{#context}}
        {{#evalMath}} 1 + {{c.d}} {{/evalMath}}
        {{/context}}
      `.trim();

      const result = renderMustacheString(template, vars, 'none');
      expect(result).toEqual(`1\n2\n3\n`);
    });

    // -------------------------------------------------------------------
    it('jexl is successful', () => {
      const vars = {
        context: {
          a: { b: 1 },
          c: { d: 2 },
          e: {
            firstName: 'Jim',
            lastName: 'Bob',
          },
        },
      };
      const template = dedent`
        {{!@ format: mustache}}
        {{#evalJexl}} 1 + 0 {{/evalJexl}}
        {{#evalJexl}} 1 + {{context.a.b}} {{/evalJexl}}
        {{#context}}
        {{#evalJexl}} 1 + {{c.d}} {{/evalJexl}}
        {{#evalJexl}} e.firstName|toLowerCase + " " + e.lastName|toUpperCase {{/evalJexl}}
        {{/context}}
      `.trim();

      const result = renderMustacheString(template, vars, 'none');
      expect(result).toEqual(`1\n2\n3\n\jim BOB\n`);
    });
  });

  describe('using handlebars', () => {
    // -------------------------------------------------------------------
    it('is supported with a format comment directive', () => {
      const template = dedent`
        {{!@ format: handlebars}}
        {{#if x}}{{x}}{{/if}}
      `.trim();

      expect(renderMustacheString(template, { x: 1 }, 'none')).toEqual('1');
    });

    // -------------------------------------------------------------------
    it('has a date helper', () => {
      const timeStamp = '2022-11-29T15:52:44Z';
      const template = dedent`
        {{!@ format: handlebars}}
        {{formatDate timeStamp}}
      `.trim();

      expect(renderMustacheString(template, { timeStamp }, 'none')).toEqual('2022-11-29 03:52pm');
    });

    // -------------------------------------------------------------------
    it('date with a time zone is successful', () => {
      const timeStamp = '2022-11-29T15:52:44Z';
      const timeZone = 'America/New_York';
      const template = dedent`
        {{!@ format: handlebars}}
        {{formatDate timeStamp timeZone="${timeZone}"}}
      `.trim();

      expect(renderMustacheString(template, { timeStamp }, 'none')).toEqual('2022-11-29 10:52am');
    });

    // -------------------------------------------------------------------
    it('date with a format is successful', () => {
      const timeStamp = '2022-11-29T15:52:44Z';
      const dateFormat = 'dddd MMM Do YYYY HH:mm:ss.SSS';
      const template = dedent`
        {{!@ format: handlebars}}
        {{formatDate timeStamp format="${dateFormat}"}}
      `.trim();

      expect(renderMustacheString(template, { timeStamp }, 'none')).toEqual(
        'Tuesday Nov 29th 2022 15:52:44.000'
      );
    });

    // -------------------------------------------------------------------
    it('date with a format and timezone is successful', () => {
      const timeStamp = '2022-11-29T15:52:44Z';
      const dateFormat = 'dddd MMM Do YYYY HH:mm:ss.SSS';
      const timeZone = 'America/New_York';
      const template = dedent`
        {{!@ format: handlebars}}
        {{formatDate timeStamp format="${dateFormat}" timeZone="${timeZone}"}}
    `.trim();

      expect(renderMustacheString(template, { timeStamp }, 'none')).toEqual(
        'Tuesday Nov 29th 2022 10:52:44.000'
      );
    });

    // -------------------------------------------------------------------
    it('json is successful', () => {
      const vars = {
        context: {
          a: {
            b: 1,
          },
          c: {
            d: 2,
          },
        },
      };
      const template = dedent`
        {{!@ format: handlebars}}
        {{formatJson context}}
    `.trim();

      expect(renderMustacheString(template, vars, 'none')).toEqual('{"a":{"b":1},"c":{"d":2}}');
    });

    // -------------------------------------------------------------------
    it('json with arrays works', () => {
      const vars = {
        context: {
          arr: [17, 42],
        },
      };
      const template = dedent`
        {{!@ format: handlebars}}
        {{formatJson context.arr}}
    `.trim();

      expect(renderMustacheString(template, vars, 'none')).toEqual('[17,42]');

      // arrays to JSON doesn't work with mustache due to legacy toString
      // support in the JS arrays
      const template2 = dedent`
        {{!@ format: handlebars}}
        {{context.arr}}
        `.trim();

      expect(renderMustacheString(template2, vars, 'none')).toEqual('17,42');
    });

    // -------------------------------------------------------------------
    it('jsonl is successful', () => {
      const vars = {
        context: {
          a: {
            b: 1,
          },
          c: {
            d: 2,
          },
        },
      };
      const template = dedent`
        {{!@ format: handlebars}}
        {{formatJsonl context}}
    `.trim();

      expect(renderMustacheString(template, vars, 'none')).toEqual(`{
    "a": {
        "b": 1
    },
    "c": {
        "d": 2
    }
}`);
    });

    // -------------------------------------------------------------------
    it('math is successful', () => {
      const vars = {
        context: {
          a: { b: 1 },
          c: { d: 2 },
        },
      };
      const template = dedent`
        {{!@ format: handlebars}}
        {{evalMath '1 + 0'}}
        {{evalMath '1 + context.a.b'}}
        {{#context}}
        {{evalMath '1 + c.d'}}
        {{/context}}
      `.trim();

      const result = renderMustacheString(template, vars, 'none');
      expect(result).toEqual(`1\n2\n3\n`);
    });

    // -------------------------------------------------------------------
    it('jexl is successful', () => {
      const vars = {
        context: {
          a: { b: 1 },
          c: { d: 2 },
          e: {
            firstName: 'Jim',
            lastName: 'Bob',
          },
        },
      };
      const template = dedent`
        {{!@ format: handlebars}}
        {{evalJexl '1 + 0'}}
        {{evalJexl '1 + context.a.b'}}
        {{#context}}
        {{evalJexl '1 + c.d'}}
        {{evalJexl 'e.firstName|toLowerCase + " " + e.lastName|toUpperCase'}}
        {{/context}}
      `.trim();

      const result = renderMustacheString(template, vars, 'none');
      expect(result).toEqual(`1\n2\n3\n\jim BOB\n`);
    });
  });
});
