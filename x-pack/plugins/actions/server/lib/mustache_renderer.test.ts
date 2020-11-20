/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderMustacheString, renderMustacheObject } from './mustache_renderer';

const variables = {
  a: 1,
  b: '2',
  c: false,
  d: null,
  e: undefined,
  f: {
    g: 3,
  },
  lt: '<',
  gt: '>',
  amp: '&',
  nl: '\n',
  dq: '"',
  bt: '`',
  bs: '\\',
  st: '*',
  ul: '_',
  st_lt: '*<',
};

describe('mustache_renderer', () => {
  describe('renderMustacheString()', () => {
    it('handles basic templating that does not need escaping', () => {
      expect(renderMustacheString('', variables, 'none')).toBe('');
      expect(renderMustacheString('{{a}}', variables, 'none')).toBe('1');
      expect(renderMustacheString('{{b}}', variables, 'none')).toBe('2');
      expect(renderMustacheString('{{c}}', variables, 'none')).toBe('false');
      expect(renderMustacheString('{{d}}', variables, 'none')).toBe('');
      expect(renderMustacheString('{{e}}', variables, 'none')).toBe('');
      expect(renderMustacheString('{{f.g}}', variables, 'none')).toBe('3');
    });

    it('handles escape:none with commonly escaped strings', () => {
      expect(renderMustacheString('{{lt}}', variables, 'none')).toBe(variables.lt);
      expect(renderMustacheString('{{gt}}', variables, 'none')).toBe(variables.gt);
      expect(renderMustacheString('{{amp}}', variables, 'none')).toBe(variables.amp);
      expect(renderMustacheString('{{nl}}', variables, 'none')).toBe(variables.nl);
      expect(renderMustacheString('{{dq}}', variables, 'none')).toBe(variables.dq);
      expect(renderMustacheString('{{bt}}', variables, 'none')).toBe(variables.bt);
      expect(renderMustacheString('{{bs}}', variables, 'none')).toBe(variables.bs);
      expect(renderMustacheString('{{st}}', variables, 'none')).toBe(variables.st);
      expect(renderMustacheString('{{ul}}', variables, 'none')).toBe(variables.ul);
    });

    it('handles escape:markdown with commonly escaped strings', () => {
      expect(renderMustacheString('{{lt}}', variables, 'markdown')).toBe(variables.lt);
      expect(renderMustacheString('{{gt}}', variables, 'markdown')).toBe(variables.gt);
      expect(renderMustacheString('{{amp}}', variables, 'markdown')).toBe(variables.amp);
      expect(renderMustacheString('{{nl}}', variables, 'markdown')).toBe(variables.nl);
      expect(renderMustacheString('{{dq}}', variables, 'markdown')).toBe(variables.dq);
      expect(renderMustacheString('{{bt}}', variables, 'markdown')).toBe('\\' + variables.bt);
      expect(renderMustacheString('{{bs}}', variables, 'markdown')).toBe('\\' + variables.bs);
      expect(renderMustacheString('{{st}}', variables, 'markdown')).toBe('\\' + variables.st);
      expect(renderMustacheString('{{ul}}', variables, 'markdown')).toBe('\\' + variables.ul);
    });

    it('handles triple escapes', () => {
      expect(renderMustacheString('{{{bt}}}', variables, 'markdown')).toBe(variables.bt);
      expect(renderMustacheString('{{{bs}}}', variables, 'markdown')).toBe(variables.bs);
      expect(renderMustacheString('{{{st}}}', variables, 'markdown')).toBe(variables.st);
      expect(renderMustacheString('{{{ul}}}', variables, 'markdown')).toBe(variables.ul);
    });

    it('handles escape:slack with commonly escaped strings', () => {
      expect(renderMustacheString('{{lt}}', variables, 'slack')).toBe('&lt;');
      expect(renderMustacheString('{{gt}}', variables, 'slack')).toBe('&gt;');
      expect(renderMustacheString('{{amp}}', variables, 'slack')).toBe('&amp;');
      expect(renderMustacheString('{{nl}}', variables, 'slack')).toBe(variables.nl);
      expect(renderMustacheString('{{dq}}', variables, 'slack')).toBe(variables.dq);
      expect(renderMustacheString('{{bt}}', variables, 'slack')).toBe(`'`);
      expect(renderMustacheString('{{bs}}', variables, 'slack')).toBe(variables.bs);
      expect(renderMustacheString('{{st}}', variables, 'slack')).toBe('`*`');
      expect(renderMustacheString('{{ul}}', variables, 'slack')).toBe('`_`');
      // html escapes not needed when using backtic escaping
      expect(renderMustacheString('{{st_lt}}', variables, 'slack')).toBe('`*<`');
    });

    it('handles escape:json with commonly escaped strings', () => {
      expect(renderMustacheString('{{lt}}', variables, 'json')).toBe(variables.lt);
      expect(renderMustacheString('{{gt}}', variables, 'json')).toBe(variables.gt);
      expect(renderMustacheString('{{amp}}', variables, 'json')).toBe(variables.amp);
      expect(renderMustacheString('{{nl}}', variables, 'json')).toBe('\\n');
      expect(renderMustacheString('{{dq}}', variables, 'json')).toBe('\\"');
      expect(renderMustacheString('{{bt}}', variables, 'json')).toBe(variables.bt);
      expect(renderMustacheString('{{bs}}', variables, 'json')).toBe('\\\\');
      expect(renderMustacheString('{{st}}', variables, 'json')).toBe(variables.st);
      expect(renderMustacheString('{{ul}}', variables, 'json')).toBe(variables.ul);
    });

    it('handles errors', () => {
      expect(renderMustacheString('{{a}', variables, 'none')).toMatchInlineSnapshot(
        `"error rendering mustache template \\"{{a}\\": Unclosed tag at 4"`
      );
    });
  });

  const object = {
    literal: 0,
    literals: {
      a: 1,
      b: '2',
      c: true,
      d: null,
      e: undefined,
      eval: '{{lt}}{{b}}{{gt}}',
    },
    list: ['{{a}}', '{{bt}}{{st}}{{bt}}'],
    object: {
      a: ['{{a}}', '{{bt}}{{st}}{{bt}}'],
    },
  };

  describe('renderMustacheObject()', () => {
    it('handles deep objects', () => {
      expect(renderMustacheObject(object, variables)).toMatchInlineSnapshot(`
        Object {
          "list": Array [
            "1",
            "\`*\`",
          ],
          "literal": 0,
          "literals": Object {
            "a": 1,
            "b": "2",
            "c": true,
            "d": null,
            "e": undefined,
            "eval": "<2>",
          },
          "object": Object {
            "a": Array [
              "1",
              "\`*\`",
            ],
          },
        }
      `);
    });

    it('handles primitive objects', () => {
      expect(renderMustacheObject(undefined, variables)).toMatchInlineSnapshot(`undefined`);
      expect(renderMustacheObject(null, variables)).toMatchInlineSnapshot(`null`);
      expect(renderMustacheObject(0, variables)).toMatchInlineSnapshot(`0`);
      expect(renderMustacheObject(true, variables)).toMatchInlineSnapshot(`true`);
      expect(renderMustacheObject('{{a}}', variables)).toMatchInlineSnapshot(`"1"`);
      expect(renderMustacheObject(['{{a}}'], variables)).toMatchInlineSnapshot(`
        Array [
          "1",
        ]
      `);
    });

    it('handles errors', () => {
      expect(renderMustacheObject({ a: '{{a}' }, variables)).toMatchInlineSnapshot(`
        Object {
          "a": "error rendering mustache template \\"{{a}\\": Unclosed tag at 4",
        }
      `);
    });
  });
});
