/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderMustacheString, renderMustacheObject, Escape } from './mustache_renderer';

const variables = {
  a: 1,
  b: '2',
  c: false,
  d: null,
  e: undefined,
  f: {
    g: 3,
    h: null,
  },
  i: [42, 43, 44],
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
    for (const escapeVal of ['none', 'slack', 'markdown', 'json']) {
      const escape = escapeVal as Escape;

      it(`handles basic templating that does not need escaping for ${escape}`, () => {
        expect(renderMustacheString('', variables, escape)).toBe('');
        expect(renderMustacheString('{{a}}', variables, escape)).toBe('1');
        expect(renderMustacheString('{{b}}', variables, escape)).toBe('2');
        expect(renderMustacheString('{{c}}', variables, escape)).toBe('false');
        expect(renderMustacheString('{{d}}', variables, escape)).toBe('');
        expect(renderMustacheString('{{e}}', variables, escape)).toBe('');
        if (escape === 'json') {
          expect(renderMustacheString('{{f}}', variables, escape)).toBe('{\\"g\\":3,\\"h\\":null}');
        } else if (escape === 'markdown') {
          expect(renderMustacheString('{{f}}', variables, escape)).toBe('\\{"g":3,"h":null\\}');
        } else {
          expect(renderMustacheString('{{f}}', variables, escape)).toBe('{"g":3,"h":null}');
        }
        expect(renderMustacheString('{{f.g}}', variables, escape)).toBe('3');
        expect(renderMustacheString('{{f.h}}', variables, escape)).toBe('');
        expect(renderMustacheString('{{i}}', variables, escape)).toBe('42,43,44');
      });
    }

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

  describe('augmented object variables', () => {
    const deepVariables = {
      a: 1,
      b: { c: 2, d: [3, 4] },
      e: [5, { f: 6, g: 7 }],
    };
    expect(renderMustacheObject({ x: '{{a}} - {{b}} -- {{e}} ' }, deepVariables))
      .toMatchInlineSnapshot(`
      Object {
        "x": "1 - {\\"c\\":2,\\"d\\":[3,4]} -- 5,{\\"f\\":6,\\"g\\":7} ",
      }
    `);

    const expected = '1 - {"c":2,"d":[3,4]} -- 5,{"f":6,"g":7}';
    expect(renderMustacheString('{{a}} - {{b}} -- {{e}}', deepVariables, 'none')).toEqual(expected);
  });
});
