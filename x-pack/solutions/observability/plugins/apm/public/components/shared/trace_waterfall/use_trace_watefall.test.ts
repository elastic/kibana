/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TraceItem } from '../../../../common/waterfall/unified_trace_item';
import { WaterfallLegendType } from '../../app/transaction_details/waterfall_with_summary/waterfall_container/waterfall/waterfall_helpers/waterfall_helpers';
import type { TraceWaterfallItem } from './use_trace_waterfall';
import {
  getTraceWaterfall,
  getServiceColors,
  getTraceParentChildrenMap,
  getTraceWaterfallDuration,
  getClockSkew,
  getServiceLegends,
} from './use_trace_waterfall';

jest.mock('@elastic/eui', () => ({
  euiPaletteColorBlind: jest.fn(({ rotations }) => {
    // Return a palette of 20 colors for testing
    return Array.from({ length: 10 * rotations }, (_, i) => `color${i}`);
  }),
}));

const root: TraceItem = {
  id: '1',
  timestamp: '2024-01-01T00:00:00.000Z',
  name: 'root',
  traceId: 't1',
  duration: 1000,
  serviceName: 'svcA',
};
const child1: TraceItem = {
  id: '2',
  parentId: '1',
  timestamp: '2024-01-01T00:00:00.500Z',
  name: 'child1',
  traceId: 't1',
  duration: 400,
  serviceName: 'svcB',
};
const child2: TraceItem = {
  id: '3',
  parentId: '1',
  timestamp: '2024-01-01T00:00:00.800Z',
  name: 'child2',
  traceId: 't1',
  duration: 100,
  serviceName: 'svcC',
};
const grandchild: TraceItem = {
  id: '4',
  parentId: '2',
  timestamp: '2024-01-01T00:00:01.000Z',
  name: 'grandchild',
  traceId: 't1',
  duration: 50,
  serviceName: 'svcD',
};

describe('getFlattenedTraceWaterfall', () => {
  afterAll(() => {
    jest.clearAllMocks();
  });

  const parentChildMap = {
    root: [root],
    '1': [child1, child2],
    '2': [grandchild],
  };

  const serviceColorsMap = {
    svcA: 'red',
    svcB: 'blue',
    svcC: 'green',
    svcD: 'yellow',
  };

  it('returns a flattened waterfall with correct depth, offset, skew, and color', () => {
    const result = getTraceWaterfall(root, parentChildMap, serviceColorsMap);

    expect(result.map((i) => i.id)).toEqual(['1', '2', '4', '3']);

    expect(result[0]).toMatchObject({
      id: '1',
      depth: 0,
      color: 'red',
      offset: 0,
      skew: 0,
    });

    expect(result[1]).toMatchObject({
      id: '2',
      depth: 1,
      color: 'blue',
    });

    expect(result[2]).toMatchObject({
      id: '4',
      depth: 2,
      color: 'yellow',
    });

    expect(result[3]).toMatchObject({
      id: '3',
      depth: 1,
      color: 'green',
    });

    expect(result[1].offset).toBe(500000); // child1: 0.5s after root
    expect(result[2].offset).toBe(1000000); // grandchild: 1s after root
    expect(result[3].offset).toBe(800000); // child2: 0.8s after root
  });

  it('returns only the root if there are no children', () => {
    const result = getTraceWaterfall(root, {}, serviceColorsMap);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
    expect(result[0].depth).toBe(0);
  });

  it('sorts children by timestamp', () => {
    const unorderedMap = {
      root: [root],
      '1': [child2, child1], // child2 timestamp is after child1
      '2': [grandchild],
    };
    const result = getTraceWaterfall(root, unorderedMap, serviceColorsMap);
    expect(result.map((i) => i.id)).toEqual(['1', '2', '4', '3']);
  });
});

describe('getServiceColors', () => {
  afterAll(() => {
    jest.clearAllMocks();
  });
  it('assigns a unique color to each serviceName', () => {
    const traceItems: TraceItem[] = [
      { id: '1', timestamp: '', name: '', traceId: '', duration: 1, serviceName: 'svcA' },
      { id: '2', timestamp: '', name: '', traceId: '', duration: 1, serviceName: 'svcB' },
      { id: '3', timestamp: '', name: '', traceId: '', duration: 1, serviceName: 'svcC' },
    ];

    const result = getServiceColors(traceItems);

    expect(Object.keys(result)).toEqual(expect.arrayContaining(['svcA', 'svcB', 'svcC']));
    expect(result.svcA).toBe('color0');
    expect(result.svcB).toBe('color1');
    expect(result.svcC).toBe('color2');
  });

  it('handles duplicate service names gracefully', () => {
    const traceItems: TraceItem[] = [
      { id: '1', timestamp: '', name: '', traceId: '', duration: 1, serviceName: 'svcA' },
      { id: '2', timestamp: '', name: '', traceId: '', duration: 1, serviceName: 'svcA' },
      { id: '3', timestamp: '', name: '', traceId: '', duration: 1, serviceName: 'svcB' },
    ];

    const result = getServiceColors(traceItems);

    expect(Object.keys(result)).toEqual(expect.arrayContaining(['svcA', 'svcB']));
    expect(result.svcA).toBe('color0');
    expect(result.svcB).toBe('color1');
  });

  it('returns an empty object if no traceItems are provided', () => {
    const result = getServiceColors([]);
    expect(result).toEqual({});
  });

  it('rotates the palette if there are more than 10 unique services', () => {
    const traceItems: TraceItem[] = Array.from({ length: 15 }, (_, i) => ({
      id: `${i}`,
      timestamp: '',
      name: '',
      traceId: '',
      duration: 1,
      serviceName: `svc${i}`,
    }));

    const result = getServiceColors(traceItems);

    expect(Object.keys(result)).toHaveLength(15);
    expect(result.svc0).toBe('color0');
    expect(result.svc10).toBe('color10');
    expect(result.svc14).toBe('color14');
  });
});

describe('getTraceMap', () => {
  afterAll(() => {
    jest.clearAllMocks();
  });
  it('maps root and children correctly', () => {
    const items: TraceItem[] = [
      { id: '1', timestamp: '', name: 'root', traceId: 't1', duration: 100, serviceName: 'svcA' },
      {
        id: '2',
        timestamp: '',
        name: 'child1',
        traceId: 't1',
        duration: 50,
        serviceName: 'svcB',
        parentId: '1',
      },
      {
        id: '3',
        timestamp: '',
        name: 'child2',
        traceId: 't1',
        duration: 30,
        serviceName: 'svcC',
        parentId: '1',
      },
      {
        id: '4',
        timestamp: '',
        name: 'grandchild',
        traceId: 't1',
        duration: 10,
        serviceName: 'svcD',
        parentId: '2',
      },
    ];

    const result = getTraceParentChildrenMap(items);

    expect(result.root).toEqual([expect.objectContaining({ id: '1' })]);
    expect(result['1']).toEqual([
      expect.objectContaining({ id: '2' }),
      expect.objectContaining({ id: '3' }),
    ]);
    expect(result['2']).toEqual([expect.objectContaining({ id: '4' })]);
  });

  it('returns only root if there are no children', () => {
    const items: TraceItem[] = [
      { id: '1', timestamp: '', name: 'root', traceId: 't1', duration: 100, serviceName: 'svcA' },
    ];

    const result = getTraceParentChildrenMap(items);

    expect(result.root).toEqual([expect.objectContaining({ id: '1' })]);
    expect(Object.keys(result)).toHaveLength(1);
  });

  it('handles multiple roots (should only keep the last as root)', () => {
    const items: TraceItem[] = [
      { id: '1', timestamp: '', name: 'root1', traceId: 't1', duration: 100, serviceName: 'svcA' },
      { id: '2', timestamp: '', name: 'root2', traceId: 't1', duration: 100, serviceName: 'svcB' },
    ];

    const result = getTraceParentChildrenMap(items);

    expect(result.root).toEqual([expect.objectContaining({ id: '2' })]);
  });

  it('returns an empty object for empty input', () => {
    const result = getTraceParentChildrenMap([]);
    expect(result).toEqual({});
  });
});

describe('getTraceWaterfallDuration', () => {
  afterAll(() => {
    jest.clearAllMocks();
  });
  it('returns the max sum of offset + skew + duration', () => {
    const items: TraceWaterfallItem[] = [
      {
        id: '1',
        timestamp: '',
        name: '',
        traceId: '',
        duration: 100,
        serviceName: 'svcA',
        depth: 0,
        offset: 0,
        skew: 0,
        color: 'red',
      },
      {
        id: '2',
        timestamp: '',
        name: '',
        traceId: '',
        duration: 50,
        serviceName: 'svcB',
        depth: 1,
        offset: 80,
        skew: 10,
        color: 'blue',
      },
      {
        id: '3',
        timestamp: '',
        name: '',
        traceId: '',
        duration: 30,
        serviceName: 'svcC',
        depth: 1,
        offset: 120,
        skew: 5,
        color: 'green',
      },
    ];
    expect(getTraceWaterfallDuration(items)).toBe(155);
  });

  it('returns 0 for empty input', () => {
    expect(getTraceWaterfallDuration([])).toBe(0);
  });
});

describe('getclockSkew', () => {
  afterAll(() => {
    jest.clearAllMocks();
  });
  const parent = {
    timestamp: '2024-01-01T00:00:00.000Z',
    duration: 1000,
    skew: 0,
  } as unknown as TraceWaterfallItem;

  it('returns 0 if no parent is provided', () => {
    const result = getClockSkew({ itemTimestamp: 1000000, itemDuration: 500 });
    expect(result).toBe(0);
  });

  it('returns 0 when item started after its parent', () => {
    const result = getClockSkew({
      itemTimestamp: new Date('2024-01-01T00:00:10.000Z').getTime() * 1000,
      itemDuration: 500,
      parent,
    });
    expect(result).toBe(0);
  });

  it('returns correct skew when item started before its parent', () => {
    const result = getClockSkew({
      itemTimestamp: new Date('2024-01-01T00:00:00.000Z').getTime() * 1000,
      itemDuration: 500,
      parent: { ...parent, timestamp: '2024-01-01T00:00:01.000Z' },
    });
    expect(result).toBe(1000250);
  });

  it('latency is never negative', () => {
    const parentWithSkew = {
      ...parent,
      timestamp: '2024-01-01T00:00:01.000Z',
      duration: 400,
      skew: 0,
    } as unknown as TraceWaterfallItem;
    const result = getClockSkew({
      itemTimestamp: new Date('2024-01-01T00:00:00.000Z').getTime() * 1000,
      itemDuration: 500,
      parent: parentWithSkew,
    });
    expect(result).toBe(1000000);
  });

  it('uses parent.skew in parentStart calculation', () => {
    const parentWithSkew = {
      ...parent,
      timestamp: '2024-01-01T00:00:01.000Z',
      skew: 100,
    } as unknown as TraceWaterfallItem;

    const result = getClockSkew({
      itemTimestamp: new Date('2024-01-01T00:00:00.000Z').getTime() * 1000,
      itemDuration: 500,
      parent: parentWithSkew,
    });
    expect(result).toBe(1000350);
  });
});

describe('getWaterfallLegends', () => {
  it('should generate waterfall legends without duplicates', () => {
    const traceItems: TraceItem[] = [root, root, child1, child2, grandchild];

    const waterfallLegends = getServiceLegends(traceItems);

    expect(waterfallLegends).toEqual([
      {
        type: WaterfallLegendType.ServiceName,
        value: traceItems[0].serviceName,
        color: 'color0',
      },
      {
        type: WaterfallLegendType.ServiceName,
        value: traceItems[2].serviceName,
        color: 'color1',
      },
      {
        type: WaterfallLegendType.ServiceName,
        value: traceItems[3].serviceName,
        color: 'color2',
      },
      {
        type: WaterfallLegendType.ServiceName,
        value: traceItems[4].serviceName,
        color: 'color3',
      },
    ]);
  });
});
