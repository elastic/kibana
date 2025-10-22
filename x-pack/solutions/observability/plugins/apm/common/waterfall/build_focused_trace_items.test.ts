/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TraceItem } from './unified_trace_item';
import {
  buildChildrenTree,
  buildFocusedTraceItems,
  flattenChildren,
  reparentDocumentToRoot,
} from './build_focused_trace_items';

const mockTraceDoc = (id: string, parentId?: string) => ({ id, parentId } as TraceItem);

describe('buildChildrenTree', () => {
  it('returns an empty array when no children are found', () => {
    const initialTraceDoc = mockTraceDoc('1');
    const itemsGroupedByParentId = {};
    const result = buildChildrenTree({
      initialTraceDoc,
      itemsGroupedByParentId,
      maxNumberOfChildren: 2,
    });
    expect(result).toEqual([]);
  });

  it('builds a tree with children and nested children', () => {
    const initialTraceDoc = mockTraceDoc('1');
    const itemsGroupedByParentId = {
      '1': [mockTraceDoc('2'), mockTraceDoc('3')],
      '2': [mockTraceDoc('4')],
    };
    const result = buildChildrenTree({
      initialTraceDoc,
      itemsGroupedByParentId,
      maxNumberOfChildren: 5,
    });
    expect(result).toEqual([
      {
        traceDoc: mockTraceDoc('2'),
        children: [
          {
            traceDoc: mockTraceDoc('4'),
            children: [],
          },
        ],
      },
      {
        traceDoc: mockTraceDoc('3'),
        children: [],
      },
    ]);
  });

  it('respects the maxNumberOfChildren limit with direct children', () => {
    const initialTraceDoc = mockTraceDoc('1');
    const itemsGroupedByParentId = {
      '1': [mockTraceDoc('2'), mockTraceDoc('3'), mockTraceDoc('4')],
    };
    const result = buildChildrenTree({
      initialTraceDoc,
      itemsGroupedByParentId,
      maxNumberOfChildren: 2,
    });
    expect(result).toEqual([
      {
        traceDoc: mockTraceDoc('2'),
        children: [],
      },
      {
        traceDoc: mockTraceDoc('3'),
        children: [],
      },
    ]);
  });

  it('respects the maxNumberOfChildren limit', () => {
    const initialTraceDoc = mockTraceDoc('1');
    const itemsGroupedByParentId = {
      '1': [mockTraceDoc('2'), mockTraceDoc('3')],
      '2': [mockTraceDoc('4')],
    };
    const result = buildChildrenTree({
      initialTraceDoc,
      itemsGroupedByParentId,
      maxNumberOfChildren: 2,
    });
    expect(result).toEqual([
      {
        traceDoc: mockTraceDoc('2'),
        children: [
          {
            traceDoc: mockTraceDoc('4'),
            children: [],
          },
        ],
      },
    ]);
  });
});

describe('buildFocusedTraceItems', () => {
  it('returns undefined if the focused trace document is not found', () => {
    const traceItems = [mockTraceDoc('1')];
    const result = buildFocusedTraceItems({ traceItems, docId: 'non-existent-id' });
    expect(result).toBeUndefined();
  });

  it('returns the correct focused trace document and its children', () => {
    const traceItems = [
      mockTraceDoc('1'),
      mockTraceDoc('2', '1'),
      mockTraceDoc('3', '1'),
      mockTraceDoc('4', '2'),
    ];
    const result = buildFocusedTraceItems({ traceItems, docId: '1' });
    expect(result).toEqual({
      rootDoc: mockTraceDoc('1'),
      parentDoc: undefined,
      focusedTraceDoc: mockTraceDoc('1'),
      focusedTraceTree: [
        {
          traceDoc: mockTraceDoc('2', '1'),
          children: [
            {
              traceDoc: mockTraceDoc('4', '2'),
              children: [],
            },
          ],
        },
      ],
    });
  });

  it('returns the correct parent document if it exists', () => {
    const traceItems = [mockTraceDoc('1'), mockTraceDoc('2', '1'), mockTraceDoc('3', '2')];
    const result = buildFocusedTraceItems({ traceItems, docId: '3' });
    expect(result).toEqual({
      rootDoc: mockTraceDoc('1'),
      parentDoc: mockTraceDoc('2', '1'),
      focusedTraceDoc: mockTraceDoc('3', '2'),
      focusedTraceTree: [],
    });
  });

  it('handles root document correctly', () => {
    const traceItems = [mockTraceDoc('1'), mockTraceDoc('2', '1'), mockTraceDoc('3', '2')];
    const result = buildFocusedTraceItems({ traceItems, docId: '1' });
    expect(result?.rootDoc).toEqual(mockTraceDoc('1'));
  });
});

describe('reparentDocumentToRoot', () => {
  it('returns undefined if items is undefined', () => {
    expect(reparentDocumentToRoot(undefined)).toBeUndefined();
  });

  it('returns a clone if rootDoc.id equals focusedTraceDoc.id', () => {
    const items = {
      rootDoc: { id: 'root' },
      focusedTraceDoc: { id: 'root' },
      focusedTraceTree: [],
    };
    const result = reparentDocumentToRoot(items as any);
    expect(result).not.toBe(items);
    expect(result?.rootDoc.id).toBe('root');
    expect(result?.rootDoc.parentId).toBeUndefined();
    expect(result?.parentDoc).toBeUndefined();
    expect(result?.focusedTraceDoc.id).toBe('root');
    expect(result?.focusedTraceDoc.parentId).toBeUndefined();
  });

  it('returns a clone if rootDoc.id equals parentDoc.id', () => {
    const items = {
      rootDoc: { id: 'root' },
      parentDoc: { id: 'root' },
      focusedTraceDoc: { id: 'focused', parentId: 'root' },
      focusedTraceTree: [],
    };
    const result = reparentDocumentToRoot(items as any);
    expect(result?.rootDoc.id).toBe('root');
    expect(result?.rootDoc.parentId).toBeUndefined();
    expect(result?.parentDoc?.id).toBe('root');
    expect(result?.parentDoc?.parentId).toBeUndefined();
    expect(result?.focusedTraceDoc.id).toBe('focused');
    expect(result?.focusedTraceDoc.parentId).toBe('root');
  });

  it('reparents parentDoc to the rootDoc if parentDoc exists and ids do not match', () => {
    const items = {
      rootDoc: { id: 'root' },
      parentDoc: { id: 'parent', parentId: 'old' },
      focusedTraceDoc: { id: 'focused', parentId: 'parent' },
      focusedTraceTree: [],
    };
    const result = reparentDocumentToRoot(items as any);
    expect(result?.rootDoc.id).toBe('root');
    expect(result?.rootDoc.parentId).toBeUndefined();
    expect(result?.parentDoc?.id).toBe('parent');
    expect(result?.parentDoc?.parentId).toBe('root');
    expect(result?.focusedTraceDoc.id).toBe('focused');
    expect(result?.focusedTraceDoc.parentId).toBe('parent');
    expect(items.parentDoc.parentId).toBe('old');
  });

  it('reparents focusedTraceDoc to rootDoc if parentDoc does not exist and ids do not match', () => {
    const items = {
      rootDoc: { id: 'root' },
      focusedTraceDoc: { id: 'focused', parentId: 'old' },
      focusedTraceTree: [],
    };
    const result = reparentDocumentToRoot(items as any);
    expect(result?.rootDoc.id).toBe('root');
    expect(result?.rootDoc.parentId).toBeUndefined();
    expect(result?.parentDoc).toBeUndefined();
    expect(result?.focusedTraceDoc.id).toBe('focused');
    expect(result?.focusedTraceDoc.parentId).toBe('root');
    expect(items.focusedTraceDoc.parentId).toBe('old');
  });

  it('returns a deep clone (does not mutate input)', () => {
    const items = {
      rootDoc: { id: 'root' },
      parentDoc: { id: 'parent', parentId: 'old' },
      focusedTraceDoc: { id: 'focused', parentId: 'parent' },
      focusedTraceTree: [],
    };
    const result = reparentDocumentToRoot(items as any);
    expect(result).not.toBe(items);
    expect(result?.parentDoc).not.toBe(items.parentDoc);
    expect(result?.focusedTraceDoc).not.toBe(items.focusedTraceDoc);
  });
});

describe('flattenChildren', () => {
  it('returns an empty array if children is empty', () => {
    expect(flattenChildren([])).toEqual([]);
  });

  it('flattens a single-level children array', () => {
    const children = [
      {
        traceDoc: {
          id: 'a',
          timestampUs: 1,
          name: 'name-a',
          traceId: 'trace-a',
          duration: 100,
          serviceName: 'service-a',
          errors: [],
        },
        children: [],
      },
      {
        traceDoc: {
          id: 'b',
          timestampUs: 2,
          name: 'name-b',
          traceId: 'trace-b',
          duration: 200,
          serviceName: 'service-b',
          errors: [],
        },
        children: [],
      },
    ];
    expect(flattenChildren(children)).toEqual([
      {
        id: 'a',
        timestampUs: 1,
        name: 'name-a',
        traceId: 'trace-a',
        duration: 100,
        serviceName: 'service-a',
        errors: [],
      },

      {
        id: 'b',
        timestampUs: 2,
        name: 'name-b',
        traceId: 'trace-b',
        duration: 200,
        serviceName: 'service-b',
        errors: [],
      },
    ]);
  });

  it('flattens nested children recursively', () => {
    const children = [
      {
        traceDoc: {
          id: 'a',
          timestampUs: 1,
          name: 'name-a',
          traceId: 'trace-a',
          duration: 100,
          serviceName: 'service-a',
          errors: [],
        },
        children: [
          {
            traceDoc: {
              id: 'b',
              timestampUs: 1,
              name: 'name-b',
              traceId: 'trace-b',
              duration: 100,
              serviceName: 'service-b',
              errors: [],
            },
            children: [
              {
                traceDoc: {
                  id: 'c',
                  timestampUs: 1,
                  name: 'name-c',
                  traceId: 'trace-c',
                  duration: 100,
                  serviceName: 'service-c',
                  errors: [],
                },
                children: [],
              },
            ],
          },
        ],
      },
      {
        traceDoc: {
          id: 'd',
          timestampUs: 1,
          name: 'name-d',
          traceId: 'trace-d',
          duration: 100,
          serviceName: 'service-d',
          errors: [],
        },
        children: [],
      },
    ];
    expect(flattenChildren(children)).toEqual([
      {
        id: 'a',
        timestampUs: 1,
        name: 'name-a',
        traceId: 'trace-a',
        duration: 100,
        serviceName: 'service-a',
        errors: [],
      },
      {
        id: 'b',
        timestampUs: 1,
        name: 'name-b',
        traceId: 'trace-b',
        duration: 100,
        serviceName: 'service-b',
        errors: [],
      },
      {
        id: 'c',
        timestampUs: 1,
        name: 'name-c',
        traceId: 'trace-c',
        duration: 100,
        serviceName: 'service-c',
        errors: [],
      },
      {
        id: 'd',
        timestampUs: 1,
        name: 'name-d',
        traceId: 'trace-d',
        duration: 100,
        serviceName: 'service-d',
        errors: [],
      },
    ]);
  });

  it('handles missing or undefined children arrays', () => {
    const children = [
      {
        traceDoc: {
          id: 'a',
          timestampUs: 1,
          name: 'name-a',
          traceId: 'trace-a',
          duration: 100,
          serviceName: 'service-a',
          errors: [],
        },
      },
      {
        traceDoc: {
          id: 'b',
          timestampUs: 1,
          name: 'name-b',
          traceId: 'trace-b',
          duration: 100,
          serviceName: 'service-b',
          errors: [],
        },
        children: [],
      },
    ];
    expect(flattenChildren(children)).toEqual([
      {
        id: 'a',
        timestampUs: 1,
        name: 'name-a',
        traceId: 'trace-a',
        duration: 100,
        serviceName: 'service-a',
        errors: [],
      },
      {
        id: 'b',
        timestampUs: 1,
        name: 'name-b',
        traceId: 'trace-b',
        duration: 100,
        serviceName: 'service-b',
        errors: [],
      },
    ]);
  });
});
