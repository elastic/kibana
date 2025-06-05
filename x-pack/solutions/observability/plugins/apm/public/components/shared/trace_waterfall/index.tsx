/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiAccordionProps } from '@elastic/eui';
import { euiPaletteColorBlind, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { WindowScroller, AutoSizer } from 'react-virtualized';
import type { ListChildComponentProps } from 'react-window';
import { areEqual, VariableSizeList as List } from 'react-window';
import { TimelineAxisContainer, VerticalLinesContainer } from '../charts/timeline';
import { ACCORDION_PADDING_LEFT, TraceItemRow } from './trace_item_row';
import { TOGGLE_BUTTON_WIDTH } from './toggle_accordion_button';
import type { TraceItem } from '../../../../common/waterfall/unified_trace_item';

export interface Props {
  traceItems: TraceItem[];
  showAccordion?: boolean;
  highlightedTraceId?: string;
  onClick?: (id: string) => void;
  onErrorClick?: (params: { traceId: string; docId: string }) => void;
}

export function TraceWaterfall({
  traceItems,
  showAccordion = true,
  highlightedTraceId,
  onClick,
  onErrorClick,
}: Props) {
  const { euiTheme } = useEuiTheme();

  const serviceColors = useMemo(() => {
    return getServiceColors(traceItems);
  }, [traceItems]);

  const traceMap = useMemo(() => {
    return getTraceMap(traceItems);
  }, [traceItems]);

  const rootItem = traceMap.root?.[0];

  const flattenedTraceWaterfall = useMemo(
    () => (rootItem ? getFlattenedTraceWaterfall(rootItem, traceMap, serviceColors) : []),
    [rootItem, serviceColors, traceMap]
  );
  const { duration, maxDepth } = useMemo(
    () => ({
      duration: getTraceWaterfallDuration(flattenedTraceWaterfall),
      maxDepth: Math.max(...flattenedTraceWaterfall.map((item) => item.depth)),
    }),
    [flattenedTraceWaterfall]
  );

  if (!rootItem) {
    return null;
  }

  const left = TOGGLE_BUTTON_WIDTH + ACCORDION_PADDING_LEFT * maxDepth;
  const right = 40;

  return (
    <div style={{ position: 'relative' }}>
      <div
        css={css`
          display: flex;
          position: sticky;
          top: var(--euiFixedHeadersOffset, 0);
          z-index: ${euiTheme.levels.menu};
          background-color: ${euiTheme.colors.emptyShade};
          border-bottom: ${euiTheme.border.thin};
        `}
      >
        <TimelineAxisContainer
          xMax={duration}
          margins={{
            top: 40,
            left,
            right,
            bottom: 0,
          }}
          numberOfTicks={3}
        />
      </div>
      <VerticalLinesContainer
        xMax={duration}
        margins={{
          top: 40,
          left,
          right,
          bottom: 0,
        }}
      />
      <div
        css={css`
          z-index: ${euiTheme.levels.toast};
          position: relative;
        `}
      >
        <TraceTree
          flattenedTraceWaterfall={flattenedTraceWaterfall}
          highlightedTraceId={highlightedTraceId}
          margin={{ left, right }}
          onClick={onClick}
          showAccordion={showAccordion}
          duration={duration}
          onErrorClick={onErrorClick}
        />
      </div>
    </div>
  );
}

export function getTraceWaterfallDuration(flattenedTraceWaterfall: FlattenedTraceItem[]) {
  return Math.max(
    ...flattenedTraceWaterfall.map((item) => item.offset + item.skew + item.duration),
    0
  );
}

export function getTraceMap(traceItems: TraceItem[]) {
  const traceMap = traceItems.reduce<Record<string, TraceItem[]>>((acc, item) => {
    if (!item.parentId) {
      acc.root = [item];
    } else {
      if (!acc[item.parentId]) {
        acc[item.parentId] = [];
      }
      acc[item.parentId].push(item);
    }
    return acc;
  }, {});

  return traceMap;
}

export function getServiceColors(traceItems: TraceItem[]) {
  const allServiceNames = new Set(traceItems.map((item) => item.serviceName));
  const palette = euiPaletteColorBlind({
    rotations: Math.ceil(allServiceNames.size / 10),
  });
  return Array.from(allServiceNames).reduce<Record<string, string>>((acc, serviceName, idx) => {
    acc[serviceName] = palette[idx];
    return acc;
  }, {});
}

function TraceTree({
  flattenedTraceWaterfall,
  margin,
  highlightedTraceId,
  onClick,
  showAccordion = true,
  duration,
  onErrorClick,
}: {
  flattenedTraceWaterfall: FlattenedTraceItem[];
  margin: { left: number; right: number };
  highlightedTraceId: Props['highlightedTraceId'];
  onClick: Props['onClick'];
  showAccordion: Props['showAccordion'];
  duration: number;
  onErrorClick: Props['onErrorClick'];
}) {
  const listRef = useRef<List>(null);
  const rowSizeMapRef = useRef(new Map<number, number>());
  const [accordionStatesMap, setAccordionStateMap] = useState(
    flattenedTraceWaterfall.reduce<Record<string, EuiAccordionProps['forceState']>>((acc, item) => {
      acc[item.id] = 'open';
      return acc;
    }, {})
  );

  const onRowLoad = (index: number, size: number) => {
    rowSizeMapRef.current.set(index, size);
  };

  const getRowSize = (index: number) => {
    return rowSizeMapRef.current.get(index) || 48 + 1;
  };

  const onScroll = ({ scrollTop }: { scrollTop: number }) => {
    listRef.current?.scrollTo(scrollTop);
  };

  const treeMap = groupByParent(flattenedTraceWaterfall);

  function toggleAccordion(id: string) {
    setAccordionStateMap((prevStates) => ({
      ...prevStates,
      [id]: prevStates[id] === 'open' ? 'closed' : 'open',
    }));
  }

  const VirtualRow = React.memo(
    ({
      index,
      style,
      data,
    }: ListChildComponentProps<{
      traceList: FlattenedTraceItem[];
      onLoad: (index: number, size: number) => void;
    }>) => {
      const { onLoad, traceList } = data;

      const ref = React.useRef<HTMLDivElement | null>(null);
      useEffect(() => {
        onLoad(index, ref.current?.getBoundingClientRect().height ?? 48);
      }, [index, onLoad]);

      const item = traceList[index];
      const children = treeMap[item.id] || [];
      return (
        <div style={style} ref={ref}>
          <TraceItemRow
            key={item.id}
            item={item}
            duration={duration}
            state={accordionStatesMap[item.id] || 'open'}
            onToggle={toggleAccordion}
            onClick={onClick}
            margin={margin}
            showAccordion={showAccordion}
            isHighlighted={item.id === highlightedTraceId}
            onErrorClick={onErrorClick}
            childrenCount={children.length}
          />
        </div>
      );
    },
    areEqual
  );

  const visibleList = useMemo(
    () => convertTreeToList(treeMap, accordionStatesMap, flattenedTraceWaterfall[0]),
    [accordionStatesMap, flattenedTraceWaterfall, treeMap]
  );

  return (
    <WindowScroller onScroll={onScroll}>
      {({ registerChild }) => (
        <AutoSizer disableHeight>
          {({ width }) => (
            // @ts-expect-error @types/react@18 Type 'HTMLDivElement' is not assignable to type 'ReactNode'
            <div data-test-subj="waterfall" ref={registerChild}>
              <List
                ref={listRef}
                style={{ height: '100%' }}
                itemCount={visibleList.length}
                itemSize={getRowSize}
                height={window.innerHeight}
                width={width}
                itemData={{ traceList: visibleList, onLoad: onRowLoad }}
              >
                {VirtualRow}
              </List>
            </div>
          )}
        </AutoSizer>
      )}
    </WindowScroller>
  );
}

export function convertTreeToList(
  treeMap: Record<string, FlattenedTraceItem[]>,
  accordionsState: Record<string, EuiAccordionProps['forceState']>,
  root?: FlattenedTraceItem
) {
  if (!root) {
    return [];
  }

  const result: FlattenedTraceItem[] = [];
  const stack: FlattenedTraceItem[] = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current) {
      const children = treeMap[current.id] || [];
      result.push(current);
      const state = accordionsState[current.id] || 'open';
      if (state === 'open') {
        for (let i = children.length - 1; i >= 0; i--) {
          stack.push(children[i]);
        }
      }
    }
  }
  return result;
}

export interface FlattenedTraceItem extends TraceItem {
  depth: number;
  offset: number;
  skew: number;
  color: string;
}

export function groupByParent(items: FlattenedTraceItem[]) {
  return items.reduce<Record<string, FlattenedTraceItem[]>>((acc, item) => {
    if (item.parentId) {
      if (!acc[item.parentId]) acc[item.parentId] = [];
      acc[item.parentId].push(item);
    }
    return acc;
  }, {});
}

export function getFlattenedTraceWaterfall(
  rootItem: TraceItem,
  parentChildMap: Record<string, TraceItem[]>,
  serviceColorsMap: Record<string, string>
) {
  const rootStartMicroseconds = toMicroseconds(rootItem.timestamp);

  function flattenItems(item: TraceItem, depth: number, parent?: FlattenedTraceItem) {
    const startMicroseconds = toMicroseconds(item.timestamp);
    let skew = 0;
    if (parent) {
      const parentTimestamp = toMicroseconds(parent.timestamp);
      const parentStart = parentTimestamp + parent.skew;

      const offsetStart = parentStart - startMicroseconds;
      if (offsetStart > 0) {
        const latency = Math.max(parent.duration - item.duration, 0) / 2;
        skew = offsetStart + latency;
      }
    }
    const color = serviceColorsMap[item.serviceName];
    const offset = startMicroseconds - rootStartMicroseconds;
    const flattenedItem: FlattenedTraceItem = { ...item, depth, offset, skew, color };
    const result: FlattenedTraceItem[] = [flattenedItem];
    const children = parentChildMap[item.id];
    const sortedChildren = children?.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    sortedChildren?.forEach((child) => {
      result.push(...flattenItems(child, depth + 1, flattenedItem));
    });
    return result;
  }

  return flattenItems(rootItem, 0);
}

const toMicroseconds = (ts: string) => new Date(ts).getTime() * 1000; // Convert ms to us
