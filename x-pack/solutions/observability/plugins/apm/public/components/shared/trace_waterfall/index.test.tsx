/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiAccordionProps } from '@elastic/eui';
import { convertTreeToList } from '.';
import type { TraceWaterfallItem } from './use_trace_waterfall';

describe('convertTreeToList', () => {
  const itemA: TraceWaterfallItem = {
    id: 'a',
    parentId: undefined,
    name: 'A',
    timestampUs: 0,
    traceId: 't1',
    duration: 100,
    serviceName: 'svcA',
    depth: 0,
    offset: 0,
    skew: 0,
    color: 'red',
    errorCount: 0,
  };
  const itemB: TraceWaterfallItem = {
    id: 'b',
    parentId: 'a',
    name: 'B',
    timestampUs: 0,
    traceId: 't1',
    duration: 50,
    serviceName: 'svcB',
    depth: 1,
    offset: 10,
    skew: 0,
    color: 'blue',
    errorCount: 0,
  };
  const itemC: TraceWaterfallItem = {
    id: 'c',
    parentId: 'a',
    name: 'C',
    timestampUs: 0,
    traceId: 't1',
    duration: 30,
    serviceName: 'svcC',
    depth: 1,
    offset: 20,
    skew: 0,
    color: 'green',
    errorCount: 0,
  };
  const itemD: TraceWaterfallItem = {
    id: 'd',
    parentId: 'b',
    name: 'D',
    timestampUs: 0,
    traceId: 't1',
    duration: 10,
    serviceName: 'svcD',
    depth: 2,
    offset: 30,
    skew: 0,
    color: 'yellow',
    errorCount: 0,
  };

  const treeMap = {
    a: [itemB, itemC],
    b: [itemD],
  };

  it('returns an empty array if root is undefined', () => {
    const result = convertTreeToList(treeMap, {}, undefined);
    expect(result).toEqual([]);
  });

  it('returns only the root if there are no children', () => {
    const result = convertTreeToList({}, {}, itemA);
    expect(result).toEqual([itemA]);
  });

  it('returns all items in depth-first order when all accordions are open', () => {
    const accordionsState: Record<string, EuiAccordionProps['forceState']> = {
      a: 'open',
      b: 'open',
      c: 'open',
      d: 'open',
    };
    const result = convertTreeToList(treeMap, accordionsState, itemA);
    // Should be: a, b, d, c
    expect(result).toEqual([itemA, itemB, itemD, itemC]);
  });

  it('skips children if accordion is closed', () => {
    const accordionsState: Record<string, EuiAccordionProps['forceState']> = {
      a: 'open',
      b: 'closed',
      c: 'open',
      d: 'open',
    };
    const result = convertTreeToList(treeMap, accordionsState, itemA);
    // Should be: a, b, c (d is not included because b is closed)
    expect(result).toEqual([itemA, itemB, itemC]);
  });

  it('defaults to open if accordion state is missing', () => {
    const accordionsState = {}; // No state provided, should default to open
    const result = convertTreeToList(treeMap, accordionsState, itemA);
    expect(result).toEqual([itemA, itemB, itemD, itemC]);
  });
});
