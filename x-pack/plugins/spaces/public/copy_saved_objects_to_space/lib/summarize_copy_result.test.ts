/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FailedImport, ProcessedImportResponse } from '.';
import type { CopyToSpaceSavedObjectTarget } from '../types';
import { summarizeCopyResult } from './summarize_copy_result';

// Sample data references:
//
//             /-> Visualization bar -> Index pattern foo
// My dashboard
//             \-> Visualization baz -> Index pattern bar
//
// Dashboard has references to visualizations, and transitive references to index patterns

const OBJECTS = {
  COPY_TARGET: {
    type: 'dashboard',
    id: 'foo',
    namespaces: [],
    icon: 'dashboardApp',
    title: 'my-dashboard-title',
  } as Required<CopyToSpaceSavedObjectTarget>,
  MY_DASHBOARD: {
    type: 'dashboard',
    id: 'foo',
    meta: {
      title: 'my-dashboard-title',
      icon: 'dashboardApp',
      namespaceType: 'single',
      hiddenType: false,
    },
    references: [
      { type: 'visualization', id: 'foo', name: 'Visualization foo' },
      { type: 'visualization', id: 'bar', name: 'Visualization bar' },
    ],
  },
  VISUALIZATION_FOO: {
    type: 'visualization',
    id: 'bar',
    meta: {
      title: 'visualization-foo-title',
      icon: 'visualizeApp',
      namespaceType: 'single',
      hiddenType: false,
    },
    references: [{ type: 'index-pattern', id: 'foo', name: 'Index pattern foo' }],
  },
  VISUALIZATION_BAR: {
    type: 'visualization',
    id: 'baz',
    meta: {
      title: 'visualization-bar-title',
      icon: 'visualizeApp',
      namespaceType: 'single',
      hiddenType: false,
    },
    references: [{ type: 'index-pattern', id: 'bar', name: 'Index pattern bar' }],
  },
  INDEX_PATTERN_FOO: {
    type: 'index-pattern',
    id: 'foo',
    meta: {
      title: 'index-pattern-foo-title',
      icon: 'indexPatternApp',
      namespaceType: 'single',
      hiddenType: false,
    },
    references: [],
  },
  INDEX_PATTERN_BAR: {
    type: 'index-pattern',
    id: 'bar',
    meta: {
      title: 'index-pattern-bar-title',
      icon: 'indexPatternApp',
      namespaceType: 'single',
      hiddenType: false,
    },
    references: [],
  },
};

interface ObjectProperties {
  type: string;
  id: string;
  meta: { title?: string; icon?: string };
}

const createSuccessResult = ({ type, id, meta }: ObjectProperties) => {
  return { type, id, meta };
};
const createFailureConflict = ({ type, id, meta }: ObjectProperties): FailedImport => {
  return { obj: { type, id, meta }, error: { type: 'conflict' } };
};
const createFailureMissingReferences = ({ type, id, meta }: ObjectProperties): FailedImport => {
  return {
    obj: { type, id, meta },
    error: { type: 'missing_references', references: [] },
  };
};
const createFailureUnresolvable = ({ type, id, meta }: ObjectProperties): FailedImport => {
  return {
    obj: { type, id, meta },
    // currently, unresolvable errors are 'unsupported_type' and 'unknown'; either would work for this test case
    error: { type: 'unknown', message: 'some error message', statusCode: 400 },
  };
};

const createCopyResult = (
  opts: {
    withConflicts?: boolean;
    withMissingReferencesError?: boolean;
    withUnresolvableError?: boolean;
    overwrite?: boolean;
  } = {}
) => {
  let successfulImports: ProcessedImportResponse['successfulImports'] = [
    createSuccessResult(OBJECTS.MY_DASHBOARD),
  ];
  let failedImports: ProcessedImportResponse['failedImports'] = [];
  if (opts.withConflicts) {
    failedImports.push(createFailureConflict(OBJECTS.VISUALIZATION_FOO));
  } else {
    successfulImports.push(createSuccessResult(OBJECTS.VISUALIZATION_FOO));
  }
  if (opts.withUnresolvableError) {
    failedImports.push(createFailureUnresolvable(OBJECTS.INDEX_PATTERN_FOO));
  } else {
    successfulImports.push(createSuccessResult(OBJECTS.INDEX_PATTERN_FOO));
  }
  if (opts.withMissingReferencesError) {
    failedImports.push(createFailureMissingReferences(OBJECTS.VISUALIZATION_BAR));
    // INDEX_PATTERN_BAR is not present in the source space, therefore VISUALIZATION_BAR resulted in a missing_references error
  } else {
    successfulImports.push(
      createSuccessResult(OBJECTS.VISUALIZATION_BAR),
      createSuccessResult(OBJECTS.INDEX_PATTERN_BAR)
    );
  }

  if (opts.overwrite) {
    failedImports = failedImports.map(({ obj, error }) => ({
      obj: { ...obj, overwrite: true },
      error,
    }));
    successfulImports = successfulImports.map((obj) => ({ ...obj, overwrite: true }));
  }

  const copyResult: ProcessedImportResponse = {
    successfulImports,
    failedImports,
  } as ProcessedImportResponse;

  return copyResult;
};

describe('summarizeCopyResult', () => {
  it('indicates the result is processing when not provided', () => {
    const copyResult = undefined;
    const summarizedResult = summarizeCopyResult(OBJECTS.COPY_TARGET, copyResult);

    expect(summarizedResult).toMatchInlineSnapshot(`
      Object {
        "objects": Array [
          Object {
            "conflict": undefined,
            "hasMissingReferences": false,
            "hasUnresolvableErrors": false,
            "icon": "dashboardApp",
            "id": "foo",
            "name": "my-dashboard-title",
            "overwrite": false,
            "type": "dashboard",
          },
        ],
        "processing": true,
      }
    `);
  });

  it('processes failedImports to extract conflicts, including transitive conflicts', () => {
    const copyResult = createCopyResult({ withConflicts: true });
    const summarizedResult = summarizeCopyResult(OBJECTS.COPY_TARGET, copyResult);

    expect(summarizedResult).toMatchInlineSnapshot(`
      Object {
        "hasConflicts": true,
        "hasMissingReferences": false,
        "hasUnresolvableErrors": false,
        "objects": Array [
          Object {
            "conflict": undefined,
            "hasMissingReferences": false,
            "hasUnresolvableErrors": false,
            "icon": "dashboardApp",
            "id": "foo",
            "name": "my-dashboard-title",
            "overwrite": false,
            "type": "dashboard",
          },
          Object {
            "conflict": Object {
              "error": Object {
                "type": "conflict",
              },
              "obj": Object {
                "id": "bar",
                "meta": Object {
                  "hiddenType": false,
                  "icon": "visualizeApp",
                  "namespaceType": "single",
                  "title": "visualization-foo-title",
                },
                "type": "visualization",
              },
            },
            "hasMissingReferences": false,
            "hasUnresolvableErrors": false,
            "icon": "visualizeApp",
            "id": "bar",
            "name": "visualization-foo-title",
            "overwrite": false,
            "type": "visualization",
          },
          Object {
            "conflict": undefined,
            "hasMissingReferences": false,
            "hasUnresolvableErrors": false,
            "icon": "indexPatternApp",
            "id": "foo",
            "name": "index-pattern-foo-title",
            "overwrite": false,
            "type": "index-pattern",
          },
          Object {
            "conflict": undefined,
            "hasMissingReferences": false,
            "hasUnresolvableErrors": false,
            "icon": "indexPatternApp",
            "id": "bar",
            "name": "index-pattern-bar-title",
            "overwrite": false,
            "type": "index-pattern",
          },
          Object {
            "conflict": undefined,
            "hasMissingReferences": false,
            "hasUnresolvableErrors": false,
            "icon": "visualizeApp",
            "id": "baz",
            "name": "visualization-bar-title",
            "overwrite": false,
            "type": "visualization",
          },
        ],
        "processing": false,
        "successful": false,
      }
    `);
  });

  it('processes failedImports to extract missing references errors', () => {
    const copyResult = createCopyResult({ withMissingReferencesError: true });
    const summarizedResult = summarizeCopyResult(OBJECTS.COPY_TARGET, copyResult);

    expect(summarizedResult).toMatchInlineSnapshot(`
      Object {
        "hasConflicts": false,
        "hasMissingReferences": true,
        "hasUnresolvableErrors": false,
        "objects": Array [
          Object {
            "conflict": undefined,
            "hasMissingReferences": false,
            "hasUnresolvableErrors": false,
            "icon": "dashboardApp",
            "id": "foo",
            "name": "my-dashboard-title",
            "overwrite": false,
            "type": "dashboard",
          },
          Object {
            "conflict": undefined,
            "hasMissingReferences": true,
            "hasUnresolvableErrors": false,
            "icon": "visualizeApp",
            "id": "baz",
            "name": "visualization-bar-title",
            "overwrite": false,
            "type": "visualization",
          },
          Object {
            "conflict": undefined,
            "hasMissingReferences": false,
            "hasUnresolvableErrors": false,
            "icon": "indexPatternApp",
            "id": "foo",
            "name": "index-pattern-foo-title",
            "overwrite": false,
            "type": "index-pattern",
          },
          Object {
            "conflict": undefined,
            "hasMissingReferences": false,
            "hasUnresolvableErrors": false,
            "icon": "visualizeApp",
            "id": "bar",
            "name": "visualization-foo-title",
            "overwrite": false,
            "type": "visualization",
          },
        ],
        "processing": false,
        "successful": false,
      }
    `);
  });

  it('processes failedImports to extract unresolvable errors', () => {
    const copyResult = createCopyResult({ withUnresolvableError: true });
    const summarizedResult = summarizeCopyResult(OBJECTS.COPY_TARGET, copyResult);

    expect(summarizedResult).toMatchInlineSnapshot(`
      Object {
        "hasConflicts": false,
        "hasMissingReferences": false,
        "hasUnresolvableErrors": true,
        "objects": Array [
          Object {
            "conflict": undefined,
            "hasMissingReferences": false,
            "hasUnresolvableErrors": false,
            "icon": "dashboardApp",
            "id": "foo",
            "name": "my-dashboard-title",
            "overwrite": false,
            "type": "dashboard",
          },
          Object {
            "conflict": undefined,
            "hasMissingReferences": false,
            "hasUnresolvableErrors": true,
            "icon": "indexPatternApp",
            "id": "foo",
            "name": "index-pattern-foo-title",
            "overwrite": false,
            "type": "index-pattern",
          },
          Object {
            "conflict": undefined,
            "hasMissingReferences": false,
            "hasUnresolvableErrors": false,
            "icon": "indexPatternApp",
            "id": "bar",
            "name": "index-pattern-bar-title",
            "overwrite": false,
            "type": "index-pattern",
          },
          Object {
            "conflict": undefined,
            "hasMissingReferences": false,
            "hasUnresolvableErrors": false,
            "icon": "visualizeApp",
            "id": "bar",
            "name": "visualization-foo-title",
            "overwrite": false,
            "type": "visualization",
          },
          Object {
            "conflict": undefined,
            "hasMissingReferences": false,
            "hasUnresolvableErrors": false,
            "icon": "visualizeApp",
            "id": "baz",
            "name": "visualization-bar-title",
            "overwrite": false,
            "type": "visualization",
          },
        ],
        "processing": false,
        "successful": false,
      }
    `);
  });

  it('processes a result without errors', () => {
    const copyResult = createCopyResult();
    const summarizedResult = summarizeCopyResult(OBJECTS.COPY_TARGET, copyResult);

    expect(summarizedResult).toMatchInlineSnapshot(`
      Object {
        "hasConflicts": false,
        "hasMissingReferences": false,
        "hasUnresolvableErrors": false,
        "objects": Array [
          Object {
            "conflict": undefined,
            "hasMissingReferences": false,
            "hasUnresolvableErrors": false,
            "icon": "dashboardApp",
            "id": "foo",
            "name": "my-dashboard-title",
            "overwrite": false,
            "type": "dashboard",
          },
          Object {
            "conflict": undefined,
            "hasMissingReferences": false,
            "hasUnresolvableErrors": false,
            "icon": "indexPatternApp",
            "id": "foo",
            "name": "index-pattern-foo-title",
            "overwrite": false,
            "type": "index-pattern",
          },
          Object {
            "conflict": undefined,
            "hasMissingReferences": false,
            "hasUnresolvableErrors": false,
            "icon": "indexPatternApp",
            "id": "bar",
            "name": "index-pattern-bar-title",
            "overwrite": false,
            "type": "index-pattern",
          },
          Object {
            "conflict": undefined,
            "hasMissingReferences": false,
            "hasUnresolvableErrors": false,
            "icon": "visualizeApp",
            "id": "bar",
            "name": "visualization-foo-title",
            "overwrite": false,
            "type": "visualization",
          },
          Object {
            "conflict": undefined,
            "hasMissingReferences": false,
            "hasUnresolvableErrors": false,
            "icon": "visualizeApp",
            "id": "baz",
            "name": "visualization-bar-title",
            "overwrite": false,
            "type": "visualization",
          },
        ],
        "processing": false,
        "successful": true,
      }
    `);
  });

  it('indicates when successes and failures have been overwritten', () => {
    const copyResult = createCopyResult({ withMissingReferencesError: true, overwrite: true });
    const summarizedResult = summarizeCopyResult(OBJECTS.COPY_TARGET, copyResult);

    expect(summarizedResult.objects).toHaveLength(4);
    for (const obj of summarizedResult.objects) {
      expect(obj.overwrite).toBe(true);
    }
  });
});
