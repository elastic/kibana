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
        obj: { type: 'visualization', id: 'foo-viz', meta: { title: 'my-viz' } },
        error: { type: 'conflict' },
      },
      {
        obj: {
          type: 'index-pattern',
          id: 'transitive-index-pattern-conflict',
          meta: { title: 'my-index-pattern' },
        },
        error: { type: 'conflict' },
      }
    );
  }
  if (opts.withUnresolvableError) {
    failedImports.push({
      obj: { type: 'visualization', id: 'bar-viz', meta: { title: 'another-viz' } },
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
            "conflict": undefined,
            "hasUnresolvableErrors": false,
            "id": "foo",
            "name": "my-dashboard",
            "type": "dashboard",
          },
          Object {
            "conflict": undefined,
            "hasUnresolvableErrors": false,
            "id": "foo-viz",
            "name": "Foo Viz",
            "type": "visualization",
          },
          Object {
            "conflict": undefined,
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

  it('processes failedImports to extract conflicts, including transitive conflicts', () => {
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
            "conflict": undefined,
            "hasUnresolvableErrors": false,
            "id": "foo",
            "name": "my-dashboard",
            "type": "dashboard",
          },
          Object {
            "conflict": Object {
              "error": Object {
                "type": "conflict",
              },
              "obj": Object {
                "id": "foo-viz",
                "meta": Object {
                  "title": "my-viz",
                },
                "type": "visualization",
              },
            },
            "hasUnresolvableErrors": false,
            "id": "foo-viz",
            "name": "Foo Viz",
            "type": "visualization",
          },
          Object {
            "conflict": undefined,
            "hasUnresolvableErrors": false,
            "id": "bar-viz",
            "name": "Bar Viz",
            "type": "visualization",
          },
          Object {
            "conflict": Object {
              "error": Object {
                "type": "conflict",
              },
              "obj": Object {
                "id": "transitive-index-pattern-conflict",
                "meta": Object {
                  "title": "my-index-pattern",
                },
                "type": "index-pattern",
              },
            },
            "hasUnresolvableErrors": false,
            "id": "transitive-index-pattern-conflict",
            "name": "my-index-pattern",
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
            "conflict": undefined,
            "hasUnresolvableErrors": false,
            "id": "foo",
            "name": "my-dashboard",
            "type": "dashboard",
          },
          Object {
            "conflict": undefined,
            "hasUnresolvableErrors": false,
            "id": "foo-viz",
            "name": "Foo Viz",
            "type": "visualization",
          },
          Object {
            "conflict": undefined,
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
            "conflict": undefined,
            "hasUnresolvableErrors": false,
            "id": "foo",
            "name": "my-dashboard",
            "type": "dashboard",
          },
          Object {
            "conflict": undefined,
            "hasUnresolvableErrors": false,
            "id": "foo-viz",
            "name": "Foo Viz",
            "type": "visualization",
          },
          Object {
            "conflict": undefined,
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
            "conflict": undefined,
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
