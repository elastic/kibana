/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';

import { renderMustacheString } from './mustache_renderer';

describe('mustache lambdas', () => {
  describe('FormatDate', () => {
    it('date with defaults is successful', () => {
      const timeStamp = '2022-11-29T15:52:44Z';
      const template = dedent`
          {{#FormatDate}} {{timeStamp}} {{/FormatDate}}
        `.trim();

      expect(renderMustacheString(template, { timeStamp }, 'none')).toEqual('2022-11-29 03:52pm');
    });

    it('date with a time zone is successful', () => {
      const timeStamp = '2022-11-29T15:52:44Z';
      const template = dedent`
          {{#FormatDate}} {{timeStamp}} ; America/New_York {{/FormatDate}}
        `.trim();

      expect(renderMustacheString(template, { timeStamp }, 'none')).toEqual('2022-11-29 10:52am');
    });

    it('date with a format is successful', () => {
      const timeStamp = '2022-11-29T15:52:44Z';
      const template = dedent`
          {{#FormatDate}} {{timeStamp}} ;; dddd MMM Do YYYY HH:mm:ss.SSS {{/FormatDate}}
        `.trim();

      expect(renderMustacheString(template, { timeStamp }, 'none')).toEqual(
        'Tuesday Nov 29th 2022 15:52:44.000'
      );
    });

    it('date with a format and timezone is successful', () => {
      const timeStamp = '2022-11-29T15:52:44Z';
      const template = dedent`
        {{#FormatDate}} {{timeStamp}};America/New_York;dddd MMM Do YYYY HH:mm:ss.SSS {{/FormatDate}}
      `.trim();

      expect(renderMustacheString(template, { timeStamp }, 'none').trim()).toEqual(
        'Tuesday Nov 29th 2022 10:52:44.000'
      );
    });

    it('empty date produces error', () => {
      const timeStamp = '';
      const template = dedent`
        {{#FormatDate}}   {{/FormatDate}}
      `.trim();

      expect(renderMustacheString(template, { timeStamp }, 'none').trim()).toEqual(
        'error rendering mustache template "{{#FormatDate}}   {{/FormatDate}}": date is empty'
      );
    });

    it('invalid date produces error', () => {
      const timeStamp = 'this is not a d4t3';
      const template = dedent`
        {{#FormatDate}}{{timeStamp}}{{/FormatDate}}
      `.trim();

      expect(renderMustacheString(template, { timeStamp }, 'none').trim()).toEqual(
        'error rendering mustache template "{{#FormatDate}}{{timeStamp}}{{/FormatDate}}": invalid date "this is not a d4t3"'
      );
    });

    it('invalid timezone produces error', () => {
      const timeStamp = '2023-04-10T23:52:39';
      const template = dedent`
        {{#FormatDate}}{{timeStamp}};NotATime Zone!{{/FormatDate}}
      `.trim();

      expect(renderMustacheString(template, { timeStamp }, 'none').trim()).toEqual(
        'error rendering mustache template "{{#FormatDate}}{{timeStamp}};NotATime Zone!{{/FormatDate}}": unknown timeZone value "NotATime Zone!"'
      );
    });

    it('invalid format produces error', () => {
      const timeStamp = '2023-04-10T23:52:39';
      const template = dedent`
        {{#FormatDate}}{{timeStamp}};;garbage{{/FormatDate}}
      `.trim();

      // not clear how to force an error, it pretty much does something with
      // ANY string
      expect(renderMustacheString(template, { timeStamp }, 'none').trim()).toEqual(
        'gamrbamg2' // a => am/pm (so am here); e => day of week
      );
    });
  });

  describe('EvalMath', () => {
    it('math is successful', () => {
      const vars = {
        context: {
          a: { b: 1 },
          c: { d: 2 },
        },
      };
      const template = dedent`
          {{#EvalMath}} 1 + 0 {{/EvalMath}}
          {{#EvalMath}} 1 + context.a.b {{/EvalMath}}
          {{#context}}
          {{#EvalMath}} 1 + c.d {{/EvalMath}}
          {{/context}}
        `.trim();

      const result = renderMustacheString(template, vars, 'none');
      expect(result).toEqual(`1\n2\n3\n`);
    });

    it('invalid expression produces error', () => {
      const vars = {
        context: {
          a: { b: 1 },
          c: { d: 2 },
        },
      };
      const template = dedent`
          {{#EvalMath}} ) 1 ++++ 0 ( {{/EvalMath}}
        `.trim();

      const result = renderMustacheString(template, vars, 'none');
      expect(result).toEqual(
        `error rendering mustache template "{{#EvalMath}} ) 1 ++++ 0 ( {{/EvalMath}}": error evaluating tinymath expression ") 1 ++++ 0 (": Failed to parse expression. Expected "(", function, literal, or whitespace but ")" found.`
      );
    });
  });

  describe('ParseHJson', () => {
    it('valid Hjson is successful', () => {
      const vars = {
        context: {
          a: { b: 1 },
          c: { d: 2 },
        },
      };
      const hjson = `
        {
          # specify rate in requests/second (because comments are helpful!)
          rate: 1000      

          a:   {{context.a}}
          a_b: {{context.a.b}}
          c:   {{context.c}}
          c_d: {{context.c.d}}

          # list items can be separated by lines, or commas, and trailing
          # commas permitted
          list: [
            1 2
            3
            4,5,6,
          ]
        }`;
      const template = dedent`
          {{#ParseHjson}} ${hjson} {{/ParseHjson}}
        `.trim();

      const result = renderMustacheString(template, vars, 'none');
      expect(JSON.parse(result)).toMatchInlineSnapshot(`
        Object {
          "a": Object {
            "b": 1,
          },
          "a_b": 1,
          "c": Object {
            "d": 2,
          },
          "c_d": 2,
          "list": Array [
            "1 2",
            3,
            4,
            5,
            6,
          ],
          "rate": 1000,
        }
      `);
    });

    it('renders an error message on parse errors', () => {
      const template = dedent`
          {{#ParseHjson}} [1,2,3,,] {{/ParseHjson}}
        `.trim();

      const result = renderMustacheString(template, {}, 'none');
      expect(result).toMatch(/^error rendering mustache template .*/);
    });
  });
});
