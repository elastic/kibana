/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { summarizeShareResult } from './summarize_share_result';
import { ProcessedImportResponse } from 'src/legacy/core_plugins/kibana/public';

const createSavedObjectsManagementRecord = () => ({
  type: 'dashboard',
  id: 'foo',
  meta: { icon: 'foo-icon', title: 'my-dashboard' },
  references: [
    {
      type: 'visualization',
      id: 'foo-viz',
      name: 'Foo Viz',
    },
    {
      type: 'visualization',
      id: 'bar-viz',
      name: 'Bar Viz',
    },
  ],
});

const createShareResult = (
  opts: { withConflicts?: boolean; withUnresolvableError?: boolean } = {}
) => {
  const failedImports: ProcessedImportResponse['failedImports'] = [];
  if (opts.withConflicts) {
    failedImports.push(
      {
        obj: { type: 'visualization', id: 'foo-viz' },
        error: { type: 'conflict' },
      },
      {
        obj: { type: 'index-pattern', id: 'transient-index-pattern-conflict' },
        error: { type: 'conflict' },
      }
    );
  }
  if (opts.withUnresolvableError) {
    failedImports.push({
      obj: { type: 'visualization', id: 'bar-viz' },
      error: { type: 'missing_references', blocking: [], references: [] },
    });
  }

  const shareResult: ProcessedImportResponse = {
    failedImports,
  } as ProcessedImportResponse;

  return shareResult;
};

describe('summarizeShareResult', () => {
  it('indicates the result is processing when not provided', () => {
    const SavedObjectsManagementRecord = createSavedObjectsManagementRecord();
    const shareResult = undefined;
    const includeRelated = true;

    const summarizedResult = summarizeShareResult(
      SavedObjectsManagementRecord,
      shareResult,
      includeRelated
    );

    expect(summarizedResult).toMatchInlineSnapshot(`
      Object {
        "objects": Array [
          Object {
            "conflicts": Array [],
            "hasUnresolvableErrors": false,
            "id": "foo",
            "name": "my-dashboard",
            "type": "dashboard",
          },
          Object {
            "conflicts": Array [],
            "hasUnresolvableErrors": false,
            "id": "foo-viz",
            "name": "Foo Viz",
            "type": "visualization",
          },
          Object {
            "conflicts": Array [],
            "hasUnresolvableErrors": false,
            "id": "bar-viz",
            "name": "Bar Viz",
            "type": "visualization",
          },
        ],
        "processing": true,
      }
    `);
  });

  it('processes failedImports to extract conflicts, including transient conflicts', () => {
    const SavedObjectsManagementRecord = createSavedObjectsManagementRecord();
    const shareResult = createShareResult({ withConflicts: true });
    const includeRelated = true;

    const summarizedResult = summarizeShareResult(
      SavedObjectsManagementRecord,
      shareResult,
      includeRelated
    );
    expect(summarizedResult).toMatchInlineSnapshot(`
      Object {
        "hasConflicts": true,
        "hasUnresolvableErrors": false,
        "objects": Array [
          Object {
            "conflicts": Array [],
            "hasUnresolvableErrors": false,
            "id": "foo",
            "name": "my-dashboard",
            "type": "dashboard",
          },
          Object {
            "conflicts": Array [
              Object {
                "error": Object {
                  "type": "conflict",
                },
                "obj": Object {
                  "id": "foo-viz",
                  "type": "visualization",
                },
              },
            ],
            "hasUnresolvableErrors": false,
            "id": "foo-viz",
            "name": "Foo Viz",
            "type": "visualization",
          },
          Object {
            "conflicts": Array [],
            "hasUnresolvableErrors": false,
            "id": "bar-viz",
            "name": "Bar Viz",
            "type": "visualization",
          },
          Object {
            "conflicts": Array [
              Object {
                "error": Object {
                  "type": "conflict",
                },
                "obj": Object {
                  "id": "transient-index-pattern-conflict",
                  "type": "index-pattern",
                },
              },
            ],
            "hasUnresolvableErrors": false,
            "id": "transient-index-pattern-conflict",
            "name": "transient-index-pattern-conflict",
            "type": "index-pattern",
          },
        ],
        "processing": false,
        "successful": false,
      }
    `);
  });

  it('processes failedImports to extract unresolvable errors', () => {
    const SavedObjectsManagementRecord = createSavedObjectsManagementRecord();
    const shareResult = createShareResult({ withUnresolvableError: true });
    const includeRelated = true;

    const summarizedResult = summarizeShareResult(
      SavedObjectsManagementRecord,
      shareResult,
      includeRelated
    );
    expect(summarizedResult).toMatchInlineSnapshot(`
      Object {
        "hasConflicts": false,
        "hasUnresolvableErrors": true,
        "objects": Array [
          Object {
            "conflicts": Array [],
            "hasUnresolvableErrors": false,
            "id": "foo",
            "name": "my-dashboard",
            "type": "dashboard",
          },
          Object {
            "conflicts": Array [],
            "hasUnresolvableErrors": false,
            "id": "foo-viz",
            "name": "Foo Viz",
            "type": "visualization",
          },
          Object {
            "conflicts": Array [],
            "hasUnresolvableErrors": true,
            "id": "bar-viz",
            "name": "Bar Viz",
            "type": "visualization",
          },
        ],
        "processing": false,
        "successful": false,
      }
    `);
  });

  it('processes a result without errors', () => {
    const SavedObjectsManagementRecord = createSavedObjectsManagementRecord();
    const shareResult = createShareResult();
    const includeRelated = true;

    const summarizedResult = summarizeShareResult(
      SavedObjectsManagementRecord,
      shareResult,
      includeRelated
    );
    expect(summarizedResult).toMatchInlineSnapshot(`
      Object {
        "hasConflicts": false,
        "hasUnresolvableErrors": false,
        "objects": Array [
          Object {
            "conflicts": Array [],
            "hasUnresolvableErrors": false,
            "id": "foo",
            "name": "my-dashboard",
            "type": "dashboard",
          },
          Object {
            "conflicts": Array [],
            "hasUnresolvableErrors": false,
            "id": "foo-viz",
            "name": "Foo Viz",
            "type": "visualization",
          },
          Object {
            "conflicts": Array [],
            "hasUnresolvableErrors": false,
            "id": "bar-viz",
            "name": "Bar Viz",
            "type": "visualization",
          },
        ],
        "processing": false,
        "successful": true,
      }
    `);
  });

  it('does not include references unless requested', () => {
    const SavedObjectsManagementRecord = createSavedObjectsManagementRecord();
    const shareResult = createShareResult();
    const includeRelated = false;

    const summarizedResult = summarizeShareResult(
      SavedObjectsManagementRecord,
      shareResult,
      includeRelated
    );
    expect(summarizedResult).toMatchInlineSnapshot(`
      Object {
        "hasConflicts": false,
        "hasUnresolvableErrors": false,
        "objects": Array [
          Object {
            "conflicts": Array [],
            "hasUnresolvableErrors": false,
            "id": "foo",
            "name": "my-dashboard",
            "type": "dashboard",
          },
        ],
        "processing": false,
        "successful": true,
      }
    `);
  });
});
