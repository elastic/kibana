/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import type { FlattenedTraceItem } from '.';
import {
  groupByParent,
  getFlattenedTraceWaterfall,
  getServiceColors,
  getTraceMap,
  getTraceWaterfallDuration,
  TraceWaterfall,
  convertTreeToList,
} from '.';
import type { Props as TraceItemRowProps } from './trace_item_row';
import type { TraceItem } from '../../../../common/waterfall/unified_trace_item';
import type { EuiAccordionProps } from '@elastic/eui';

jest.mock('@elastic/eui', () => ({
  euiPaletteColorBlind: jest.fn(({ rotations }) => {
    // Return a palette of 20 colors for testing
    return Array.from({ length: 10 * rotations }, (_, i) => `color${i}`);
  }),
  useEuiTheme: () => ({
    euiTheme: {
      levels: { menu: 1, toast: 2 },
      colors: { emptyShade: '#fff' },
      border: { thin: '1px solid #eee' },
    },
  }),
}));

jest.mock('../charts/timeline', () => ({
  TimelineAxisContainer: (props: any) => <div data-test-subj="timeline-axis" {...props} />,
  VerticalLinesContainer: (props: any) => <div data-test-subj="vertical-lines" {...props} />,
}));

jest.mock('./trace_item_row', () => ({
  TraceItemRow: (props: TraceItemRowProps) => (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events
    <div
      data-test-subj={`trace-item-row-${props.item.id}`}
      data-id={props.item.id}
      onClick={() => props.onClick?.(props.item.id)}
      {...(props.isHighlighted ? { 'data-highlighted': true } : {})}
    >
      {props.item.name}
      {props.children}
    </div>
  ),
  ACCORDION_PADDING_LEFT: 10,
}));

describe('groupByParent', () => {
  it('groups items by their parentId', () => {
    const items: FlattenedTraceItem[] = [
      {
        id: '1',
        parentId: undefined,
        depth: 0,
        offset: 0,
        skew: 0,
        color: 'red',
        timestamp: '2024-01-01T00:00:00Z',
        name: 'root',
        traceId: 't1',
        duration: 100,
        serviceName: 'svcA',
      },
      {
        id: '2',
        parentId: '1',
        depth: 1,
        offset: 10,
        skew: 0,
        color: 'blue',
        timestamp: '2024-01-01T00:00:01Z',
        name: 'child1',
        traceId: 't1',
        duration: 50,
        serviceName: 'svcB',
      },
      {
        id: '3',
        parentId: '1',
        depth: 1,
        offset: 20,
        skew: 0,
        color: 'green',
        timestamp: '2024-01-01T00:00:02Z',
        name: 'child2',
        traceId: 't1',
        duration: 30,
        serviceName: 'svcC',
      },
      {
        id: '4',
        parentId: '2',
        depth: 2,
        offset: 30,
        skew: 0,
        color: 'yellow',
        timestamp: '2024-01-01T00:00:03Z',
        name: 'grandchild',
        traceId: 't1',
        duration: 10,
        serviceName: 'svcD',
      },
    ];

    const result = groupByParent(items);

    expect(result).toEqual({
      '1': [expect.objectContaining({ id: '2' }), expect.objectContaining({ id: '3' })],
      '2': [expect.objectContaining({ id: '4' })],
    });
  });

  it('returns an empty object if no items have parentId', () => {
    const items: FlattenedTraceItem[] = [
      {
        id: '1',
        parentId: undefined,
        depth: 0,
        offset: 0,
        skew: 0,
        color: 'red',
        timestamp: '2024-01-01T00:00:00Z',
        name: 'root',
        traceId: 't1',
        duration: 100,
        serviceName: 'svcA',
      },
    ];

    const result = groupByParent(items);

    expect(result).toEqual({});
  });

  it('handles multiple children for the same parent', () => {
    const items: FlattenedTraceItem[] = [
      {
        id: '2',
        parentId: '1',
        depth: 1,
        offset: 10,
        skew: 0,
        color: 'blue',
        timestamp: '2024-01-01T00:00:01Z',
        name: 'child1',
        traceId: 't1',
        duration: 50,
        serviceName: 'svcB',
      },
      {
        id: '3',
        parentId: '1',
        depth: 1,
        offset: 20,
        skew: 0,
        color: 'green',
        timestamp: '2024-01-01T00:00:02Z',
        name: 'child2',
        traceId: 't1',
        duration: 30,
        serviceName: 'svcC',
      },
    ];

    const result = groupByParent(items);

    expect(result['1']).toHaveLength(2);
    expect(result['1'].map((i) => i.id)).toEqual(['2', '3']);
  });
});

describe('getFlattenedTraceWaterfall', () => {
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
    const result = getFlattenedTraceWaterfall(root, parentChildMap, serviceColorsMap);

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
    const result = getFlattenedTraceWaterfall(root, {}, serviceColorsMap);
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
    const result = getFlattenedTraceWaterfall(root, unorderedMap, serviceColorsMap);
    expect(result.map((i) => i.id)).toEqual(['1', '2', '4', '3']);
  });
});

describe('getServiceColors', () => {
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

    const result = getTraceMap(items);

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

    const result = getTraceMap(items);

    expect(result.root).toEqual([expect.objectContaining({ id: '1' })]);
    expect(Object.keys(result)).toHaveLength(1);
  });

  it('handles multiple roots (should only keep the last as root)', () => {
    const items: TraceItem[] = [
      { id: '1', timestamp: '', name: 'root1', traceId: 't1', duration: 100, serviceName: 'svcA' },
      { id: '2', timestamp: '', name: 'root2', traceId: 't1', duration: 100, serviceName: 'svcB' },
    ];

    const result = getTraceMap(items);

    expect(result.root).toEqual([expect.objectContaining({ id: '2' })]);
  });

  it('returns an empty object for empty input', () => {
    const result = getTraceMap([]);
    expect(result).toEqual({});
  });
});

describe('getTraceWaterfallDuration', () => {
  it('returns the max sum of offset + skew + duration', () => {
    const items: FlattenedTraceItem[] = [
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

const traceItems: TraceItem[] = [
  {
    id: '1',
    timestamp: '2025-01-01T00:00:00.000Z',
    name: 'root',
    traceId: 't1',
    duration: 1000,
    serviceName: 'svcA',
  },
  {
    id: '2',
    timestamp: '2025-01-01T00:00:00.500Z',
    name: 'child1',
    traceId: 't1',
    duration: 400,
    serviceName: 'svcB',
    parentId: '1',
  },
  {
    id: '3',
    timestamp: '2025-01-01T00:00:00.800Z',
    name: 'child2',
    traceId: 't1',
    duration: 100,
    serviceName: 'svcC',
    parentId: '1',
  },
];
describe('TraceWaterfall', () => {
  it('renders timeline axis, vertical lines, and trace tree', () => {
    const { getByTestId } = render(<TraceWaterfall traceItems={traceItems} />);
    expect(getByTestId('timeline-axis')).toBeInTheDocument();
    expect(getByTestId('vertical-lines')).toBeInTheDocument();
    expect(getByTestId('trace-item-row-1')).toHaveAttribute('data-id', '1');
    expect(getByTestId('trace-item-row-2')).toHaveAttribute('data-id', '2');
    expect(getByTestId('trace-item-row-3')).toHaveAttribute('data-id', '3');
  });

  it('highlights the correct trace item', () => {
    const { getByTestId } = render(
      <TraceWaterfall traceItems={traceItems} highlightedTraceId="2" />
    );
    expect(getByTestId('trace-item-row-2')).toHaveAttribute('data-highlighted', 'true');
  });

  it('calls onClick when a trace item is clicked', () => {
    const onClick = jest.fn();
    const { getByTestId } = render(<TraceWaterfall traceItems={traceItems} onClick={onClick} />);
    fireEvent.click(getByTestId('trace-item-row-2'));
    expect(onClick).toHaveBeenCalledWith('2');
  });

  it('returns null if there is no root item', () => {
    const { container } = render(<TraceWaterfall traceItems={[]} />);
    expect(container.firstChild).toBeNull();
  });
});

describe('convertTreeToList', () => {
  const itemA: FlattenedTraceItem = {
    id: 'a',
    parentId: undefined,
    name: 'A',
    timestamp: '',
    traceId: 't1',
    duration: 100,
    serviceName: 'svcA',
    depth: 0,
    offset: 0,
    skew: 0,
    color: 'red',
  };
  const itemB: FlattenedTraceItem = {
    id: 'b',
    parentId: 'a',
    name: 'B',
    timestamp: '',
    traceId: 't1',
    duration: 50,
    serviceName: 'svcB',
    depth: 1,
    offset: 10,
    skew: 0,
    color: 'blue',
  };
  const itemC: FlattenedTraceItem = {
    id: 'c',
    parentId: 'a',
    name: 'C',
    timestamp: '',
    traceId: 't1',
    duration: 30,
    serviceName: 'svcC',
    depth: 1,
    offset: 20,
    skew: 0,
    color: 'green',
  };
  const itemD: FlattenedTraceItem = {
    id: 'd',
    parentId: 'b',
    name: 'D',
    timestamp: '',
    traceId: 't1',
    duration: 10,
    serviceName: 'svcD',
    depth: 2,
    offset: 30,
    skew: 0,
    color: 'yellow',
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
