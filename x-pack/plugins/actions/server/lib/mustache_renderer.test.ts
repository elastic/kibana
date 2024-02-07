/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import {
  renderMustacheString,
  renderMustacheStringNoEscape,
  renderMustacheObject,
  Escape,
} from './mustache_renderer';

const logger = loggingSystemMock.create().get();

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
  link: 'https://te_st.com/',
};

describe('mustache_renderer', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('renderMustacheString()', () => {
    for (const escapeVal of ['none', 'slack', 'markdown', 'json']) {
      const escape = escapeVal as Escape;

      it(`handles basic templating that does not need escaping for ${escape}`, () => {
        expect(renderMustacheString(logger, '', variables, escape)).toBe('');
        expect(renderMustacheString(logger, '{{a}}', variables, escape)).toBe('1');
        expect(renderMustacheString(logger, '{{b}}', variables, escape)).toBe('2');
        expect(renderMustacheString(logger, '{{c}}', variables, escape)).toBe('false');
        expect(renderMustacheString(logger, '{{d}}', variables, escape)).toBe('');
        expect(renderMustacheString(logger, '{{e}}', variables, escape)).toBe('');
        if (escape === 'json') {
          expect(renderMustacheString(logger, '{{f}}', variables, escape)).toBe(
            '{\\"g\\":3,\\"h\\":null}'
          );
        } else if (escape === 'markdown') {
          expect(renderMustacheString(logger, '{{f}}', variables, escape)).toBe(
            '\\{"g":3,"h":null\\}'
          );
        } else {
          expect(renderMustacheString(logger, '{{f}}', variables, escape)).toBe('{"g":3,"h":null}');
        }
        expect(renderMustacheString(logger, '{{f.g}}', variables, escape)).toBe('3');
        expect(renderMustacheString(logger, '{{f.h}}', variables, escape)).toBe('');
        expect(renderMustacheString(logger, '{{i}}', variables, escape)).toBe('42,43,44');

        if (escape === 'markdown') {
          expect(renderMustacheString(logger, '{{i.asJSON}}', variables, escape)).toBe(
            '\\[42,43,44\\]'
          );
        } else {
          expect(renderMustacheString(logger, '{{i.asJSON}}', variables, escape)).toBe(
            '[42,43,44]'
          );
        }
      });
    }

    it('handles escape:none with commonly escaped strings', () => {
      expect(renderMustacheString(logger, '{{lt}}', variables, 'none')).toBe(variables.lt);
      expect(renderMustacheString(logger, '{{gt}}', variables, 'none')).toBe(variables.gt);
      expect(renderMustacheString(logger, '{{amp}}', variables, 'none')).toBe(variables.amp);
      expect(renderMustacheString(logger, '{{nl}}', variables, 'none')).toBe(variables.nl);
      expect(renderMustacheString(logger, '{{dq}}', variables, 'none')).toBe(variables.dq);
      expect(renderMustacheString(logger, '{{bt}}', variables, 'none')).toBe(variables.bt);
      expect(renderMustacheString(logger, '{{bs}}', variables, 'none')).toBe(variables.bs);
      expect(renderMustacheString(logger, '{{st}}', variables, 'none')).toBe(variables.st);
      expect(renderMustacheString(logger, '{{ul}}', variables, 'none')).toBe(variables.ul);
    });

    it('handles escape:markdown with commonly escaped strings', () => {
      expect(renderMustacheString(logger, '{{lt}}', variables, 'markdown')).toBe(variables.lt);
      expect(renderMustacheString(logger, '{{gt}}', variables, 'markdown')).toBe(variables.gt);
      expect(renderMustacheString(logger, '{{amp}}', variables, 'markdown')).toBe(variables.amp);
      expect(renderMustacheString(logger, '{{nl}}', variables, 'markdown')).toBe(variables.nl);
      expect(renderMustacheString(logger, '{{dq}}', variables, 'markdown')).toBe(variables.dq);
      expect(renderMustacheString(logger, '{{bt}}', variables, 'markdown')).toBe(
        '\\' + variables.bt
      );
      expect(renderMustacheString(logger, '{{bs}}', variables, 'markdown')).toBe(
        '\\' + variables.bs
      );
      expect(renderMustacheString(logger, '{{st}}', variables, 'markdown')).toBe(
        '\\' + variables.st
      );
      expect(renderMustacheString(logger, '{{ul}}', variables, 'markdown')).toBe(
        '\\' + variables.ul
      );
      expect(renderMustacheString(logger, '{{vl}}', variables, 'markdown')).toBe(
        '\\' + variables.vl
      );
    });

    it('handles triple escapes', () => {
      expect(renderMustacheString(logger, '{{{bt}}}', variables, 'markdown')).toBe(variables.bt);
      expect(renderMustacheString(logger, '{{{bs}}}', variables, 'markdown')).toBe(variables.bs);
      expect(renderMustacheString(logger, '{{{st}}}', variables, 'markdown')).toBe(variables.st);
      expect(renderMustacheString(logger, '{{{ul}}}', variables, 'markdown')).toBe(variables.ul);
    });

    it('handles escape:slack with commonly escaped strings', () => {
      expect(renderMustacheString(logger, '{{lt}}', variables, 'slack')).toBe('&lt;');
      expect(renderMustacheString(logger, '{{gt}}', variables, 'slack')).toBe('&gt;');
      expect(renderMustacheString(logger, '{{amp}}', variables, 'slack')).toBe('&amp;');
      expect(renderMustacheString(logger, '{{nl}}', variables, 'slack')).toBe(variables.nl);
      expect(renderMustacheString(logger, '{{dq}}', variables, 'slack')).toBe(variables.dq);
      expect(renderMustacheString(logger, '{{bt}}', variables, 'slack')).toBe(`'`);
      expect(renderMustacheString(logger, '{{bs}}', variables, 'slack')).toBe(variables.bs);
      expect(renderMustacheString(logger, '{{st}}', variables, 'slack')).toBe('`*`');
      expect(renderMustacheString(logger, '{{ul}}', variables, 'slack')).toBe('`_`');
      // html escapes not needed when using backtic escaping
      expect(renderMustacheString(logger, '{{st_lt}}', variables, 'slack')).toBe('`*<`');
      expect(renderMustacheString(logger, '{{link}}', variables, 'slack')).toBe(
        'https://te_st.com/'
      );
    });

    it('handles escape:json with commonly escaped strings', () => {
      expect(renderMustacheString(logger, '{{lt}}', variables, 'json')).toBe(variables.lt);
      expect(renderMustacheString(logger, '{{gt}}', variables, 'json')).toBe(variables.gt);
      expect(renderMustacheString(logger, '{{amp}}', variables, 'json')).toBe(variables.amp);
      expect(renderMustacheString(logger, '{{nl}}', variables, 'json')).toBe('\\n');
      expect(renderMustacheString(logger, '{{dq}}', variables, 'json')).toBe('\\"');
      expect(renderMustacheString(logger, '{{bt}}', variables, 'json')).toBe(variables.bt);
      expect(renderMustacheString(logger, '{{bs}}', variables, 'json')).toBe('\\\\');
      expect(renderMustacheString(logger, '{{st}}', variables, 'json')).toBe(variables.st);
      expect(renderMustacheString(logger, '{{ul}}', variables, 'json')).toBe(variables.ul);
    });

    it('handles errors', () => {
      expect(renderMustacheString(logger, '{{a}', variables, 'none')).toMatchInlineSnapshot(
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
      expect(renderMustacheObject(logger, object, variables)).toMatchInlineSnapshot(`
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
      expect(renderMustacheObject(logger, undefined, variables)).toMatchInlineSnapshot(`undefined`);
      expect(renderMustacheObject(logger, null, variables)).toMatchInlineSnapshot(`null`);
      expect(renderMustacheObject(logger, 0, variables)).toMatchInlineSnapshot(`0`);
      expect(renderMustacheObject(logger, true, variables)).toMatchInlineSnapshot(`true`);
      expect(renderMustacheObject(logger, '{{a}}', variables)).toMatchInlineSnapshot(`"1"`);
      expect(renderMustacheObject(logger, ['{{a}}'], variables)).toMatchInlineSnapshot(`
        Array [
          "1",
        ]
      `);
    });

    it('handles errors', () => {
      expect(renderMustacheObject(logger, { a: '{{a}' }, variables)).toMatchInlineSnapshot(`
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
    expect(renderMustacheObject(logger, { x: '{{a}} - {{b}} -- {{e}} ' }, deepVariables))
      .toMatchInlineSnapshot(`
      Object {
        "x": "1 - {\\"c\\":2,\\"d\\":[3,4]} -- 5,{\\"f\\":6,\\"g\\":7} ",
      }
    `);

    const expected = '1 - {"c":2,"d":[3,4]} -- 5,{"f":6,"g":7}';
    expect(renderMustacheString(logger, '{{a}} - {{b}} -- {{e}}', deepVariables, 'none')).toEqual(
      expected
    );

    expect(renderMustacheString(logger, '{{e}}', deepVariables, 'none')).toEqual('5,{"f":6,"g":7}');
    expect(renderMustacheString(logger, '{{e.asJSON}}', deepVariables, 'none')).toEqual(
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
          logger,
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
          logger,
          '{{context.0._source.kibana.alert.rule.category}} - {{context.0._score.test}} - {{context.0._source.kibana.alert.time_range.gte}}',
          dotVariables,
          'none'
        )
      ).toEqual('Metric threshold - 1 - 2022-10-26T13:37:26.591Z');
    });

    it('should replace single value with the object', () => {
      expect(renderMustacheObject(logger, { x: '{{a}}' }, { a: 1, 'a.b': 2 }))
        .toMatchInlineSnapshot(`
        Object {
          "x": "{\\"b\\":2}",
        }
      `);
      expect(renderMustacheString(logger, '{{a}}', { a: 1, 'a.b': 2 }, 'none')).toEqual('{"b":2}');
    });
  });
});
