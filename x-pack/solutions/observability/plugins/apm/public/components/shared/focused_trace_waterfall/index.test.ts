/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { reparentDocumentToRoot, flattenChildren } from '.';

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
          timestamp: '1',
          name: 'name-a',
          traceId: 'trace-a',
          duration: 100,
          serviceName: 'service-a',
        },
        children: [],
      },
      {
        traceDoc: {
          id: 'b',
          timestamp: '2',
          name: 'name-b',
          traceId: 'trace-b',
          duration: 200,
          serviceName: 'service-b',
        },
        children: [],
      },
    ];
    expect(flattenChildren(children)).toEqual([
      {
        id: 'a',
        timestamp: '1',
        name: 'name-a',
        traceId: 'trace-a',
        duration: 100,
        serviceName: 'service-a',
      },
      {
        id: 'b',
        timestamp: '2',
        name: 'name-b',
        traceId: 'trace-b',
        duration: 200,
        serviceName: 'service-b',
      },
    ]);
  });

  it('flattens nested children recursively', () => {
    const children = [
      {
        traceDoc: {
          id: 'a',
          timestamp: '1',
          name: 'name-a',
          traceId: 'trace-a',
          duration: 100,
          serviceName: 'service-a',
        },
        children: [
          {
            traceDoc: {
              id: 'b',
              timestamp: '1',
              name: 'name-b',
              traceId: 'trace-b',
              duration: 100,
              serviceName: 'service-b',
            },
            children: [
              {
                traceDoc: {
                  id: 'c',
                  timestamp: '1',
                  name: 'name-c',
                  traceId: 'trace-c',
                  duration: 100,
                  serviceName: 'service-c',
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
          timestamp: '1',
          name: 'name-d',
          traceId: 'trace-d',
          duration: 100,
          serviceName: 'service-d',
        },
        children: [],
      },
    ];
    expect(flattenChildren(children)).toEqual([
      {
        id: 'a',
        timestamp: '1',
        name: 'name-a',
        traceId: 'trace-a',
        duration: 100,
        serviceName: 'service-a',
      },
      {
        id: 'b',
        timestamp: '1',
        name: 'name-b',
        traceId: 'trace-b',
        duration: 100,
        serviceName: 'service-b',
      },
      {
        id: 'c',
        timestamp: '1',
        name: 'name-c',
        traceId: 'trace-c',
        duration: 100,
        serviceName: 'service-c',
      },
      {
        id: 'd',
        timestamp: '1',
        name: 'name-d',
        traceId: 'trace-d',
        duration: 100,
        serviceName: 'service-d',
      },
    ]);
  });

  it('handles missing or undefined children arrays', () => {
    const children = [
      {
        traceDoc: {
          id: 'a',
          timestamp: '1',
          name: 'name-a',
          traceId: 'trace-a',
          duration: 100,
          serviceName: 'service-a',
        },
      },
      {
        traceDoc: {
          id: 'b',
          timestamp: '1',
          name: 'name-b',
          traceId: 'trace-b',
          duration: 100,
          serviceName: 'service-b',
        },
        children: [],
      },
    ];
    expect(flattenChildren(children)).toEqual([
      {
        id: 'a',
        timestamp: '1',
        name: 'name-a',
        traceId: 'trace-a',
        duration: 100,
        serviceName: 'service-a',
      },
      {
        id: 'b',
        timestamp: '1',
        name: 'name-b',
        traceId: 'trace-b',
        duration: 100,
        serviceName: 'service-b',
      },
    ]);
  });
});
