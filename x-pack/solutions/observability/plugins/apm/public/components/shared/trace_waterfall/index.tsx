/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiAccordionProps } from '@elastic/eui';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AutoSizer, WindowScroller } from 'react-virtualized';
import type { ListChildComponentProps } from 'react-window';
import { VariableSizeList as List, areEqual } from 'react-window';
import type { TraceItem } from '../../../../common/waterfall/unified_trace_item';
import { TimelineAxisContainer, VerticalLinesContainer } from '../charts/timeline';
import { TOGGLE_BUTTON_WIDTH } from './toggle_accordion_button';
import {
  ACCORDION_HEIGHT,
  ACCORDION_PADDING_LEFT,
  BORDER_THICKNESS,
  TraceItemRow,
} from './trace_item_row';
import type { TraceWaterfallItem } from './use_trace_waterfall';
import { useTraceWaterfall } from './use_trace_waterfall';

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
  const { duration, traceWaterfall, maxDepth, rootItem } = useTraceWaterfall({
    traceItems,
  });

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
          traceWaterfall={traceWaterfall}
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

function TraceTree({
  traceWaterfall,
  margin,
  highlightedTraceId,
  onClick,
  showAccordion = true,
  duration,
  onErrorClick,
}: {
  traceWaterfall: TraceWaterfallItem[];
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
    traceWaterfall.reduce<Record<string, EuiAccordionProps['forceState']>>((acc, item) => {
      acc[item.id] = 'open';
      return acc;
    }, {})
  );

  const onRowLoad = (index: number, size: number) => {
    rowSizeMapRef.current.set(index, size);
  };

  const getRowSize = (index: number) => {
    return rowSizeMapRef.current.get(index) || ACCORDION_HEIGHT + BORDER_THICKNESS;
  };

  const onScroll = ({ scrollTop }: { scrollTop: number }) => {
    listRef.current?.scrollTo(scrollTop);
  };

  const treeMap = useMemo(() => groupByParent(traceWaterfall), [traceWaterfall]);

  const visibleList = useMemo(
    () => convertTreeToList(treeMap, accordionStatesMap, traceWaterfall[0]),
    [accordionStatesMap, traceWaterfall, treeMap]
  );

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
      traceList: TraceWaterfallItem[];
      onLoad: (index: number, size: number) => void;
    }>) => {
      const { onLoad, traceList } = data;

      const ref = React.useRef<HTMLDivElement | null>(null);
      useEffect(() => {
        onLoad(index, ref.current?.getBoundingClientRect().height ?? ACCORDION_HEIGHT);
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
  treeMap: Record<string, TraceWaterfallItem[]>,
  accordionsState: Record<string, EuiAccordionProps['forceState']>,
  root?: TraceWaterfallItem
) {
  if (!root) {
    return [];
  }

  const result: TraceWaterfallItem[] = [];
  const stack: TraceWaterfallItem[] = [root];
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

export function groupByParent(items: TraceWaterfallItem[]) {
  return items.reduce<Record<string, TraceWaterfallItem[]>>((acc, item) => {
    if (item.parentId) {
      if (!acc[item.parentId]) acc[item.parentId] = [];
      acc[item.parentId].push(item);
    }
    return acc;
  }, {});
}
