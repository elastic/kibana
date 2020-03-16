/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { extractReferences, injectReferences } from './saved_workspace_references';
import { SavedWorkspace } from './saved_workspace';

describe('extractReferences', () => {
  test('extracts references from wsState', () => {
    const doc = {
      id: '1',
      attributes: {
        foo: true,
        wsState: JSON.stringify(
          JSON.stringify({
            indexPattern: 'pattern*',
            bar: true,
          })
        ),
      },
      references: [],
    };
    const updatedDoc = extractReferences(doc);
    expect(updatedDoc).toMatchInlineSnapshot(`
Object {
  "attributes": Object {
    "foo": true,
    "wsState": "\\"{\\\\\\"bar\\\\\\":true,\\\\\\"indexPatternRefName\\\\\\":\\\\\\"indexPattern_0\\\\\\"}\\"",
  },
  "references": Array [
    Object {
      "id": "pattern*",
      "name": "indexPattern_0",
      "type": "index-pattern",
    },
  ],
}
`);
  });

  test('fails when indexPattern is missing from workspace', () => {
    const doc = {
      id: '1',
      attributes: {
        wsState: JSON.stringify(
          JSON.stringify({
            bar: true,
          })
        ),
      },
      references: [],
    };
    expect(() => extractReferences(doc)).toThrowErrorMatchingInlineSnapshot(
      `"indexPattern attribute is missing in \\"wsState\\""`
    );
  });
});

describe('injectReferences', () => {
  test('injects references into context', () => {
    const context = {
      id: '1',
      title: 'test',
      wsState: JSON.stringify({
        indexPatternRefName: 'indexPattern_0',
        bar: true,
      }),
    } as SavedWorkspace;
    const references = [
      {
        name: 'indexPattern_0',
        type: 'index-pattern',
        id: 'pattern*',
      },
    ];
    injectReferences(context, references);
    expect(context).toMatchInlineSnapshot(`
Object {
  "id": "1",
  "title": "test",
  "wsState": "{\\"bar\\":true,\\"indexPattern\\":\\"pattern*\\"}",
}
`);
  });

  test('skips when wsState is not a string', () => {
    const context = {
      id: '1',
      title: 'test',
    } as SavedWorkspace;
    injectReferences(context, []);
    expect(context).toMatchInlineSnapshot(`
Object {
  "id": "1",
  "title": "test",
}
`);
  });

  test('skips when indexPatternRefName is missing wsState', () => {
    const context = {
      id: '1',
      wsState: JSON.stringify({ bar: true }),
    } as SavedWorkspace;
    injectReferences(context, []);
    expect(context).toMatchInlineSnapshot(`
Object {
  "id": "1",
  "wsState": "{\\"bar\\":true}",
}
`);
  });

  test(`fails when it can't find the reference in the array`, () => {
    const context = {
      id: '1',
      wsState: JSON.stringify({
        indexPatternRefName: 'indexPattern_0',
      }),
    } as SavedWorkspace;
    expect(() => injectReferences(context, [])).toThrowErrorMatchingInlineSnapshot(
      `"Could not find reference \\"indexPattern_0\\""`
    );
  });
});
