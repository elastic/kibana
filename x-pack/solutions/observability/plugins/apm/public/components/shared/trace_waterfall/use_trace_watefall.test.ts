/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { WaterfallLegendType } from '../../../../common/waterfall/legend';
import type { TraceItem } from '../../../../common/waterfall/unified_trace_item';
import type { TraceWaterfallItem } from './use_trace_waterfall';
import {
  getTraceWaterfall,
  getTraceParentChildrenMap,
  getTraceWaterfallDuration,
  getClockSkew,
  getLegends,
  createColorLookupMap,
  getRootItemOrFallback,
  TraceDataState,
} from './use_trace_waterfall';

jest.mock('@elastic/eui', () => ({
  euiPaletteColorBlind: jest.fn(({ rotations }) => {
    // Return a palette of 20 colors for testing
    return Array.from({ length: 10 * rotations }, (_, i) => `color${i}`);
  }),
}));

const root: TraceItem = {
  id: '1',
  timestampUs: new Date('2024-01-01T00:00:00.000Z').getTime() * 1000,
  name: 'root',
  traceId: 't1',
  duration: 1000,
  serviceName: 'svcA',
  errors: [],
};
const child1: TraceItem = {
  id: '2',
  parentId: '1',
  timestampUs: new Date('2024-01-01T00:00:00.500Z').getTime() * 1000,
  name: 'child1',
  traceId: 't1',
  duration: 400,
  serviceName: 'svcB',
  errors: [],
};
const child2: TraceItem = {
  id: '3',
  parentId: '1',
  timestampUs: new Date('2024-01-01T00:00:00.800Z').getTime() * 1000,
  name: 'child2',
  traceId: 't1',
  duration: 100,
  serviceName: 'svcC',
  errors: [],
};
const grandchild: TraceItem = {
  id: '4',
  parentId: '2',
  timestampUs: new Date('2024-01-01T00:00:01.000Z').getTime() * 1000,
  name: 'grandchild',
  traceId: 't1',
  duration: 50,
  serviceName: 'svcD',
  errors: [],
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

  const serviceColorsMap = new Map<string, string>([
    ['serviceName:svcA', 'red'],
    ['serviceName:svcB', 'blue'],
    ['serviceName:svcC', 'green'],
    ['serviceName:svcD', 'yellow'],
  ]);

  it('returns a flattened waterfall with correct depth, offset, skew, and color', () => {
    const result = getTraceWaterfall({
      rootItem: root,
      parentChildMap,
      orphans: [],
      colorMap: serviceColorsMap,
      colorBy: WaterfallLegendType.ServiceName,
    });

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
    const result = getTraceWaterfall({
      rootItem: root,
      parentChildMap: {},
      orphans: [],
      colorMap: serviceColorsMap,
      colorBy: WaterfallLegendType.ServiceName,
    });
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
    const result = getTraceWaterfall({
      rootItem: root,
      parentChildMap: unorderedMap,
      orphans: [],
      colorMap: serviceColorsMap,
      colorBy: WaterfallLegendType.ServiceName,
    });
    expect(result.map((i) => i.id)).toEqual(['1', '2', '4', '3']);
  });

  it('reparents orphan spans', () => {
    const result = getTraceWaterfall({
      rootItem: root,
      parentChildMap: {},
      orphans: [grandchild],
      colorMap: serviceColorsMap,
      colorBy: WaterfallLegendType.ServiceName,
    });

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('1');
    expect(result[0].depth).toBe(0);
    expect(result[1].id).toBe('4');
    expect(result[1].depth).toBe(1);
  });
});

describe('getLegends', () => {
  afterAll(() => {
    jest.clearAllMocks();
  });
  it('assigns a unique color to each resource', () => {
    const traceItems: TraceItem[] = [
      {
        id: '1',
        timestampUs: 0,
        name: '',
        traceId: '',
        duration: 1,
        serviceName: 'svcA',
        errors: [],
      },
      {
        id: '2',
        timestampUs: 0,
        name: '',
        traceId: '',
        duration: 1,
        serviceName: 'svcB',
        errors: [],
      },
      {
        id: '3',
        timestampUs: 0,
        name: '',
        traceId: '',
        duration: 1,
        serviceName: 'svcC',
        errors: [],
      },
      {
        id: '4',
        timestampUs: 0,
        name: '',
        traceId: '',
        duration: 1,
        serviceName: 'svcC',
        type: 'db',
        errors: [],
      },
      {
        id: '5',
        timestampUs: 0,
        name: '',
        traceId: '',
        duration: 1,
        serviceName: 'svcC',
        type: 'http',
        errors: [],
      },
      {
        id: '6',
        timestampUs: 0,
        name: '',
        traceId: '',
        duration: 1,
        serviceName: 'svcC',
        type: 'cache',
        errors: [],
      },
    ];

    const result = getLegends(traceItems);
    expect(result).toEqual([
      { type: WaterfallLegendType.ServiceName, value: 'svcA', color: 'color0' },
      { type: WaterfallLegendType.ServiceName, value: 'svcB', color: 'color1' },
      { type: WaterfallLegendType.ServiceName, value: 'svcC', color: 'color2' },
      { type: WaterfallLegendType.Type, value: '', color: 'color3' }, // needed in the legends component to display the service name when colorBy is Type
      { type: WaterfallLegendType.Type, value: 'db', color: 'color4' },
      { type: WaterfallLegendType.Type, value: 'http', color: 'color5' },
      { type: WaterfallLegendType.Type, value: 'cache', color: 'color6' },
    ]);
  });

  it('handles duplicate resource names gracefully', () => {
    const traceItems: TraceItem[] = [
      {
        id: '1',
        timestampUs: 0,
        name: '',
        traceId: '',
        duration: 1,
        serviceName: 'svcA',
        errors: [],
      },
      {
        id: '2',
        timestampUs: 0,
        name: '',
        traceId: '',
        duration: 1,
        serviceName: 'svcA',
        errors: [],
      },
      {
        id: '3',
        timestampUs: 0,
        name: '',
        traceId: '',
        duration: 1,
        serviceName: 'svcB',
        errors: [],
      },
      {
        id: '5',
        timestampUs: 0,
        name: '',
        traceId: '',
        duration: 1,
        serviceName: 'svcB',
        type: 'http',
        errors: [],
      },
      {
        id: '6',
        timestampUs: 0,
        name: '',
        traceId: '',
        duration: 1,
        serviceName: 'svcB',
        type: 'http',
        errors: [],
      },
    ];

    const result = getLegends(traceItems);

    expect(result).toEqual([
      { type: WaterfallLegendType.ServiceName, value: 'svcA', color: 'color0' },
      { type: WaterfallLegendType.ServiceName, value: 'svcB', color: 'color1' },
      { type: WaterfallLegendType.Type, value: '', color: 'color2' }, // needed in the legends component to display the service name when colorBy is Type
      { type: WaterfallLegendType.Type, value: 'http', color: 'color3' },
    ]);
  });

  it('returns an empty object if no traceItems are provided', () => {
    const result = getLegends([]);
    expect(result).toEqual([]);
  });

  it('rotates the palette if there are more than 10 unique resources', () => {
    const traceItems: TraceItem[] = Array.from({ length: 15 }, (_, i) => ({
      id: `${i}`,
      timestampUs: 0,
      name: '',
      traceId: '',
      duration: 1,
      serviceName: `svc${i}`,
      errors: [],
    }));

    const result = getLegends(traceItems);

    expect(Object.keys(result)).toHaveLength(16); // 15+1 for legends component to display the service name when colorBy is Type

    expect(result[0].color).toBe('color0');
    expect(result[10].color).toBe('color10');
    expect(result[14].color).toBe('color14');
  });
});

describe('createColorLookupMap', () => {
  afterAll(() => {
    jest.clearAllMocks();
  });

  it('create map of colors', () => {
    const legends = [
      { type: WaterfallLegendType.ServiceName, value: 'svcA', color: 'red' },
      { type: WaterfallLegendType.ServiceName, value: 'svcB', color: 'blue' },
      { type: WaterfallLegendType.Type, value: 'db', color: 'green' },
    ];

    const result = createColorLookupMap(legends);

    expect(result.get('serviceName:svcA')).toBe('red');
    expect(result.get('serviceName:svcB')).toBe('blue');
    expect(result.get('type:db')).toBe('green');
  });
});

describe('getTraceMap', () => {
  afterAll(() => {
    jest.clearAllMocks();
  });
  it('maps root and children correctly', () => {
    const items: TraceItem[] = [
      {
        id: '1',
        timestampUs: 0,
        name: 'root',
        traceId: 't1',
        duration: 100,
        serviceName: 'svcA',
        errors: [],
      },
      {
        id: '2',
        timestampUs: 0,
        name: 'child1',
        traceId: 't1',
        duration: 50,
        serviceName: 'svcB',
        parentId: '1',
        errors: [],
      },
      {
        id: '3',
        timestampUs: 0,
        name: 'child2',
        traceId: 't1',
        duration: 30,
        serviceName: 'svcC',
        parentId: '1',
        errors: [],
      },
      {
        id: '4',
        timestampUs: 0,
        name: 'grandchild',
        traceId: 't1',
        duration: 10,
        serviceName: 'svcD',
        parentId: '2',
        errors: [],
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
      {
        id: '1',
        timestampUs: 0,
        name: 'root',
        traceId: 't1',
        duration: 100,
        serviceName: 'svcA',
        errors: [],
      },
    ];

    const result = getTraceParentChildrenMap(items);

    expect(result.root).toEqual([expect.objectContaining({ id: '1' })]);
    expect(Object.keys(result)).toHaveLength(1);
  });

  it('handles multiple roots (should only keep the last as root)', () => {
    const items: TraceItem[] = [
      {
        id: '1',
        timestampUs: 0,
        name: 'root1',
        traceId: 't1',
        duration: 100,
        serviceName: 'svcA',
        errors: [],
      },
      {
        id: '2',
        timestampUs: 0,
        name: 'root2',
        traceId: 't1',
        duration: 100,
        serviceName: 'svcB',
        errors: [],
      },
    ];

    const result = getTraceParentChildrenMap(items);

    expect(result.root).toEqual([expect.objectContaining({ id: '2' })]);
  });

  it('returns an empty object for empty input', () => {
    const result = getTraceParentChildrenMap([]);
    expect(result).toEqual({});
  });
});

describe('getRootItemOrFallback', () => {
  it('should return a FULL state and a rootItem for a complete trace', () => {
    const traceData = [root, child1, child2, grandchild];

    const result = getRootItemOrFallback(getTraceParentChildrenMap(traceData), traceData);

    expect(result.rootItem).toEqual(root);
    expect(result.traceState).toBe(TraceDataState.Full);
    expect(result.orphans).toEqual([]);
  });

  it('should return an EMPTY state for an empty trace', () => {
    const result = getRootItemOrFallback({}, []);

    expect(result.rootItem).toBeUndefined();
    expect(result.traceState).toBe(TraceDataState.Empty);
    expect(result.orphans).toBeUndefined();
  });

  it('should return a PARTIAL state for an incomplete trace with no root span', () => {
    const traceData = [child1, grandchild];

    const result = getRootItemOrFallback(getTraceParentChildrenMap(traceData), traceData);

    expect(result.rootItem).toEqual(child1);
    expect(result.traceState).toBe(TraceDataState.Partial);
    expect(result.orphans).toEqual([]);
  });

  it('should return a PARTIAL state for an incomplete trace with orphan child spans', () => {
    const traceData = [root, child2, grandchild];

    const result = getRootItemOrFallback(getTraceParentChildrenMap(traceData), traceData);

    expect(result.rootItem).toEqual(root);
    expect(result.traceState).toBe(TraceDataState.Partial);
    expect(result.orphans).toEqual([grandchild]);
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
        timestampUs: 0,
        name: '',
        traceId: '',
        duration: 100,
        serviceName: 'svcA',
        depth: 0,
        offset: 0,
        skew: 0,
        color: 'red',
        errors: [],
        isOrphan: false,
      },
      {
        id: '2',
        timestampUs: 0,
        name: '',
        traceId: '',
        duration: 50,
        serviceName: 'svcB',
        depth: 1,
        offset: 80,
        skew: 10,
        color: 'blue',
        errors: [],
        isOrphan: false,
      },
      {
        id: '3',
        timestampUs: 0,
        name: '',
        traceId: '',
        duration: 30,
        serviceName: 'svcC',
        depth: 1,
        offset: 120,
        skew: 5,
        color: 'green',
        errors: [],
        isOrphan: false,
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
    timestampUs: new Date('2024-01-01T00:00:00.000Z').getTime() * 1000,
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
      parent: { ...parent, timestampUs: new Date('2024-01-01T00:00:01.000Z').getTime() * 1000 },
    });
    expect(result).toBe(1000250);
  });

  it('latency is never negative', () => {
    const parentWithSkew = {
      ...parent,
      timestampUs: new Date('2024-01-01T00:00:01.000Z').getTime() * 1000,
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
      timestampUs: new Date('2024-01-01T00:00:01.000Z').getTime() * 1000,
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
