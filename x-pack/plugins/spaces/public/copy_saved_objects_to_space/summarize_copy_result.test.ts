/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { summarizeCopyResult } from './summarize_copy_result';
import { ProcessedImportResponse } from 'src/plugins/saved_objects_management/public';

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

const createCopyResult = (
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

  const copyResult: ProcessedImportResponse = {
    failedImports,
  } as ProcessedImportResponse;

  return copyResult;
};

describe('summarizeCopyResult', () => {
  it('indicates the result is processing when not provided', () => {
    const SavedObjectsManagementRecord = createSavedObjectsManagementRecord();
    const copyResult = undefined;
    const includeRelated = true;

    const summarizedResult = summarizeCopyResult(
      SavedObjectsManagementRecord,
      copyResult,
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
    const copyResult = createCopyResult({ withConflicts: true });
    const includeRelated = true;

    const summarizedResult = summarizeCopyResult(
      SavedObjectsManagementRecord,
      copyResult,
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
    const copyResult = createCopyResult({ withUnresolvableError: true });
    const includeRelated = true;

    const summarizedResult = summarizeCopyResult(
      SavedObjectsManagementRecord,
      copyResult,
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
    const copyResult = createCopyResult();
    const includeRelated = true;

    const summarizedResult = summarizeCopyResult(
      SavedObjectsManagementRecord,
      copyResult,
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
    const copyResult = createCopyResult();
    const includeRelated = false;

    const summarizedResult = summarizeCopyResult(
      SavedObjectsManagementRecord,
      copyResult,
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
