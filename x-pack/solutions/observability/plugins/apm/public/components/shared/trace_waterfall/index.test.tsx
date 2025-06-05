/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { groupByParent, TraceWaterfall, convertTreeToList } from '.';
import type { Props as TraceItemRowProps } from './trace_item_row';
import type { TraceItem } from '../../../../common/waterfall/unified_trace_item';
import type { EuiAccordionProps } from '@elastic/eui';
import type { TraceWaterfallItem } from './use_trace_waterfall';

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
    </div>
  ),
  ACCORDION_PADDING_LEFT: 10,
}));

describe('groupByParent', () => {
  it('groups items by their parentId', () => {
    const items: TraceWaterfallItem[] = [
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
    const items: TraceWaterfallItem[] = [
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
    const items: TraceWaterfallItem[] = [
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
  const itemA: TraceWaterfallItem = {
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
  const itemB: TraceWaterfallItem = {
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
  const itemC: TraceWaterfallItem = {
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
  const itemD: TraceWaterfallItem = {
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
