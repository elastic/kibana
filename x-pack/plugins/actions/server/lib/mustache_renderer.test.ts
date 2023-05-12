/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  renderMustacheString,
  renderMustacheStringNoEscape,
  renderMustacheObject,
  Escape,
} from './mustache_renderer';

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
  vl: '|',
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

        if (escape === 'markdown') {
          expect(renderMustacheString('{{i.asJSON}}', variables, escape)).toBe('\\[42,43,44\\]');
        } else {
          expect(renderMustacheString('{{i.asJSON}}', variables, escape)).toBe('[42,43,44]');
        }
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
      expect(renderMustacheString('{{vl}}', variables, 'markdown')).toBe('\\' + variables.vl);
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
  describe('renderMustacheStringNoEscape()', () => {
    const id = 'cool_id';
    const title = 'cool_title';
    const summary = 'A cool good summary';
    const description = 'A cool good description';
    const tags = ['cool', 'neat', 'nice'];
    const str = 'https://coolsite.net/browse/{{{external.system.title}}}';

    const objStr =
      '{\n' +
      '\t"fields": {\n' +
      '\t  "summary": {{{case.title}}},\n' +
      '\t  "description": {{{case.description}}},\n' +
      '\t  "labels": {{{case.tags}}},\n' +
      '\t  "project":{"key":"ROC"},\n' +
      '\t  "issuetype":{"id":"10024"}\n' +
      '\t}\n' +
      '}';
    const objStrDouble =
      '{\n' +
      '\t"fields": {\n' +
      '\t  "summary": {{case.title}},\n' +
      '\t  "description": {{case.description}},\n' +
      '\t  "labels": {{case.tags}},\n' +
      '\t  "project":{"key":"ROC"},\n' +
      '\t  "issuetype":{"id":"10024"}\n' +
      '\t}\n' +
      '}';
    const caseVariables = {
      case: {
        title: summary,
        description,
        tags,
      },
    };
    const caseVariablesStr = {
      case: {
        title: JSON.stringify(summary),
        description: JSON.stringify(description),
        tags: JSON.stringify(tags),
      },
    };
    it('Inserts variables into string without quotes', () => {
      const urlVariables = {
        external: {
          system: {
            id,
            title,
          },
        },
      };
      expect(renderMustacheStringNoEscape(str, urlVariables)).toBe(
        `https://coolsite.net/browse/cool_title`
      );
    });
    it('Inserts variables into url with quotes whens stringified', () => {
      const urlVariablesStr = {
        external: {
          system: {
            id: JSON.stringify(id),
            title: JSON.stringify(title),
          },
        },
      };
      expect(renderMustacheStringNoEscape(str, urlVariablesStr)).toBe(
        `https://coolsite.net/browse/"cool_title"`
      );
    });
    it('Inserts variables into JSON non-escaped when triple brackets and JSON.stringified variables', () => {
      expect(renderMustacheStringNoEscape(objStr, caseVariablesStr)).toBe(
        `{
\t"fields": {
\t  "summary": "A cool good summary",
\t  "description": "A cool good description",
\t  "labels": ["cool","neat","nice"],
\t  "project":{"key":"ROC"},
\t  "issuetype":{"id":"10024"}
\t}
}`
      );
    });
    it('Inserts variables into JSON without quotes when triple brackets and NON stringified variables', () => {
      expect(renderMustacheStringNoEscape(objStr, caseVariables)).toBe(
        `{
\t"fields": {
\t  "summary": A cool good summary,
\t  "description": A cool good description,
\t  "labels": cool,neat,nice,
\t  "project":{"key":"ROC"},
\t  "issuetype":{"id":"10024"}
\t}
}`
      );
    });
    it('Inserts variables into JSON escaped when double brackets and JSON.stringified variables', () => {
      expect(renderMustacheStringNoEscape(objStrDouble, caseVariablesStr)).toBe(
        `{
\t"fields": {
\t  "summary": &quot;A cool good summary&quot;,
\t  "description": &quot;A cool good description&quot;,
\t  "labels": [&quot;cool&quot;,&quot;neat&quot;,&quot;nice&quot;],
\t  "project":{"key":"ROC"},
\t  "issuetype":{"id":"10024"}
\t}
}`
      );
    });
    it('Inserts variables into JSON without quotes when double brackets and NON stringified variables', () => {
      expect(renderMustacheStringNoEscape(objStrDouble, caseVariables)).toBe(
        `{
\t"fields": {
\t  "summary": A cool good summary,
\t  "description": A cool good description,
\t  "labels": cool,neat,nice,
\t  "project":{"key":"ROC"},
\t  "issuetype":{"id":"10024"}
\t}
}`
      );
    });

    it('handles errors triple bracket', () => {
      expect(renderMustacheStringNoEscape('{{{a}}', variables)).toMatchInlineSnapshot(
        `"error rendering mustache template \\"{{{a}}\\": Unclosed tag at 6"`
      );
    });

    it('handles errors double bracket', () => {
      expect(renderMustacheStringNoEscape('{{a}', variables)).toMatchInlineSnapshot(
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

    expect(renderMustacheString('{{e}}', deepVariables, 'none')).toEqual('5,{"f":6,"g":7}');
    expect(renderMustacheString('{{e.asJSON}}', deepVariables, 'none')).toEqual(
      '[5,{"f":6,"g":7}]'
    );
  });

  describe('converting dot variables', () => {
    it('handles multiple dots', () => {
      const dotVariables = {
        context: [
          {
            _index: '.internal.alerts-observability.metrics.alerts-default-000001',
            _id: 'a8616ced-c22b-466c-a964-8db53af930ef',
            '_score.test': 1,
            _source: {
              'kibana.alert.rule.category': 'Metric threshold',
              'kibana.alert.rule.consumer': 'infrastructure',
              'kibana.alert.rule.execution.uuid': 'c42da290-30be-4e90-a7fb-75e160bac758',
              'kibana.alert.rule.name': 'test rule',
              'kibana.alert.rule.producer': 'infrastructure',
              'kibana.alert.rule.rule_type_id': 'metrics.alert.threshold',
              'kibana.alert.rule.uuid': '534c0f20-5533-11ed-b0da-c1155191eec9',
              'kibana.space_ids': ['default'],
              'kibana.alert.rule.tags': [],
              '@timestamp': '2022-10-26T13:50:06.516Z',
              'kibana.alert.reason':
                'event.duration is 235,545,454.54545 in the last 1 min for execute. Alert when > 0.',
              'kibana.alert.duration.us': 759925000,
              'kibana.alert.time_range': {
                gte: '2022-10-26T13:37:26.591Z',
              },
              'kibana.alert.instance.id': 'execute',
              'kibana.alert.start': '2022-10-26T13:37:26.591Z',
              'kibana.alert.uuid': 'a8616ced-c22b-466c-a964-8db53af930ef',
              'kibana.alert.status': 'active',
              'kibana.alert.workflow_status': 'open',
              'event.kind': 'signal',
              'event.action': 'active',
              'kibana.version': '8.6.0',
              tags: [],
            },
          },
        ],
      };

      expect(
        renderMustacheObject(
          {
            x: '{{context.0._source.kibana.alert.rule.category}} - {{context.0._score.test}} - {{context.0._source.kibana.alert.time_range.gte}}',
          },
          dotVariables
        )
      ).toMatchInlineSnapshot(`
        Object {
          "x": "Metric threshold - 1 - 2022-10-26T13:37:26.591Z",
        }
      `);

      expect(
        renderMustacheString(
          '{{context.0._source.kibana.alert.rule.category}} - {{context.0._score.test}} - {{context.0._source.kibana.alert.time_range.gte}}',
          dotVariables,
          'none'
        )
      ).toEqual('Metric threshold - 1 - 2022-10-26T13:37:26.591Z');
    });

    it('should replace single value with the object', () => {
      expect(renderMustacheObject({ x: '{{a}}' }, { a: 1, 'a.b': 2 })).toMatchInlineSnapshot(`
        Object {
          "x": "{\\"b\\":2}",
        }
      `);
      expect(renderMustacheString('{{a}}', { a: 1, 'a.b': 2 }, 'none')).toEqual('{"b":2}');
    });
  });
});
