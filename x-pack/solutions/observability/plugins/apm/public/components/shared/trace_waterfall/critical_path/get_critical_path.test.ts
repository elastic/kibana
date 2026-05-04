/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getCriticalPath } from './get_critical_path';
import type { CriticalPathBase } from './types';

interface TestItem extends CriticalPathBase {
  name: string;
}

// Durations and timestamps in the test inputs are expressed in milliseconds for
// readability; offset / duration on CriticalPathBase are in microseconds.
const MS_TO_US = 1000;

function item({
  id,
  name,
  startMs,
  durationMs,
  rootStartMs = 0,
}: {
  id: string;
  name: string;
  startMs: number;
  durationMs: number;
  rootStartMs?: number;
}): TestItem {
  return {
    id,
    name,
    offset: (startMs - rootStartMs) * MS_TO_US,
    duration: durationMs * MS_TO_US,
    skew: 0,
  };
}

function mapById(items: TestItem[]): Record<string, TestItem> {
  return items.reduce<Record<string, TestItem>>((acc, current) => {
    acc[current.id] = current;
    return acc;
  }, {});
}

describe('getCriticalPath', () => {
  it('adds the only active span to the critical path', () => {
    const root = item({
      id: 't1',
      name: '/service-a',
      startMs: 1,
      durationMs: 100,
      rootStartMs: 1,
    });
    const foo = item({ id: 's-foo', name: 'foo', startMs: 1, durationMs: 100, rootStartMs: 1 });

    const parentChildMap = { [root.id]: [foo] };

    const { segments } = getCriticalPath(root, parentChildMap);

    expect(segments).toEqual([
      { self: false, duration: 100000, item: root, offset: 0 },
      { self: false, duration: 100000, item: foo, offset: 0 },
      { self: true, duration: 100000, item: foo, offset: 0 },
    ]);
  });

  it('adds the span that ended last', () => {
    const root = item({
      id: 't1',
      name: '/service-a',
      startMs: 1,
      durationMs: 100,
      rootStartMs: 1,
    });
    const foo = item({ id: 's-foo', name: 'foo', startMs: 1, durationMs: 99, rootStartMs: 1 });
    const bar = item({ id: 's-bar', name: 'bar', startMs: 1, durationMs: 100, rootStartMs: 1 });

    const parentChildMap = { [root.id]: [foo, bar] };

    const { segments } = getCriticalPath(root, parentChildMap);

    expect(segments).toEqual([
      { self: false, duration: 100000, item: root, offset: 0 },
      { self: false, duration: 100000, item: bar, offset: 0 },
      { self: true, duration: 100000, item: bar, offset: 0 },
    ]);
  });

  it('adds segment for uninstrumented gaps in the parent', () => {
    const root = item({
      id: 't1',
      name: '/service-a',
      startMs: 1,
      durationMs: 100,
      rootStartMs: 1,
    });
    const foo = item({ id: 's-foo', name: 'foo', startMs: 11, durationMs: 50, rootStartMs: 1 });

    const parentChildMap = { [root.id]: [foo] };

    const { segments } = getCriticalPath(root, parentChildMap);

    expect(
      segments.map((segment) => ({
        self: segment.self,
        duration: segment.duration,
        id: segment.item.id,
        offset: segment.offset,
      }))
    ).toEqual([
      { self: false, duration: 100000, id: root.id, offset: 0 },
      { self: true, duration: 40000, id: root.id, offset: 60000 },
      { self: false, duration: 50000, id: foo.id, offset: 10000 },
      { self: true, duration: 50000, id: foo.id, offset: 10000 },
      { self: true, duration: 10000, id: root.id, offset: 0 },
    ]);
  });

  it('only considers a single child to be active at the same time', () => {
    const rootStartMs = 1;
    const s1 = item({ id: 's1', name: 's1', startMs: 1, durationMs: 100, rootStartMs });
    const s2 = item({ id: 's2', name: 's2', startMs: 1, durationMs: 1, rootStartMs });
    const s3 = item({ id: 's3', name: 's3', startMs: 2, durationMs: 1, rootStartMs });
    const s4 = item({ id: 's4', name: 's4', startMs: 3, durationMs: 98, rootStartMs });
    const s5 = item({ id: 's5', name: 's5', startMs: 1, durationMs: 98, rootStartMs });
    const s6 = item({ id: 's6', name: 's6', startMs: 5, durationMs: 30, rootStartMs });
    const s7 = item({ id: 's7', name: 's7', startMs: 35, durationMs: 30, rootStartMs });

    const parentChildMap = {
      [s1.id]: [s2, s3, s4, s5],
      [s5.id]: [s6, s7],
    };

    const { segments } = getCriticalPath(s1, parentChildMap);

    expect(segments.filter((segment) => segment.self).map((segment) => segment.item.id)).toEqual([
      s4.id,
      s3.id,
      s2.id,
    ]);
  });

  // https://www.uber.com/en-NL/blog/crisp-critical-path-analysis-for-microservice-architectures/
  it('correctly returns the critical path for the CRISP example', () => {
    const rootStartMs = 1;
    const s1 = item({ id: 's1', name: 's1', startMs: 1, durationMs: 100, rootStartMs });
    const s2 = item({ id: 's2', name: 's2', startMs: 6, durationMs: 25, rootStartMs });
    const s3 = item({ id: 's3', name: 's3', startMs: 41, durationMs: 50, rootStartMs });
    const s4 = item({ id: 's4', name: 's4', startMs: 61, durationMs: 20, rootStartMs });
    const s5 = item({ id: 's5', name: 's5', startMs: 51, durationMs: 30, rootStartMs });

    // Children of s3 are passed in timestamp order (s5 at 51ms, s4 at 61ms) —
    // matching how the upstream waterfall construction feeds them in. Both end
    // at the same time, so this order is what lets s5 win the critical path tie.
    const parentChildMap = {
      [s1.id]: [s2, s3],
      [s3.id]: [s5, s4],
    };

    const { segments } = getCriticalPath(s1, parentChildMap);

    const byId = mapById([s1, s2, s3, s4, s5]);

    expect(
      segments
        .filter((segment) => segment.self)
        .map((segment) => ({
          self: segment.self,
          duration: segment.duration,
          id: segment.item.id,
          offset: segment.offset,
        }))
    ).toEqual([
      // T9-T10
      { self: true, duration: 10000, id: s1.id, offset: 90000 },
      // T8-T9
      { self: true, duration: 10000, id: s3.id, offset: 80000 },
      // T5-T8
      { self: true, duration: byId[s5.id].duration, id: s5.id, offset: byId[s5.id].offset },
      // T4-T5
      { self: true, duration: 10000, id: s3.id, offset: 40000 },
      // T3-T4
      { self: true, duration: 10000, id: s1.id, offset: 30000 },
      // T2-T3
      { self: true, duration: 25000, id: s2.id, offset: 5000 },
      // T1-T2
      { self: true, duration: 5000, id: s1.id, offset: 0 },
    ]);
  });
});
