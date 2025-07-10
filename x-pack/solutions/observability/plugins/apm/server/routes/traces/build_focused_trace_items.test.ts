/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TraceItem } from '../../../common/waterfall/unified_trace_item';
import { buildChildrenTree, buildFocusedTraceItems } from './build_focused_trace_items';

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
