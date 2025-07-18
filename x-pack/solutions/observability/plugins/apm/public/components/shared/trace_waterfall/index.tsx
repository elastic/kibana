/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiAccordionProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AutoSizer, WindowScroller } from 'react-virtualized';
import type { ListChildComponentProps } from 'react-window';
import { VariableSizeList as List, areEqual } from 'react-window';
import type { IWaterfallGetRelatedErrorsHref } from '../../../../common/waterfall/typings';
import type { TraceItem } from '../../../../common/waterfall/unified_trace_item';
import { TimelineAxisContainer, VerticalLinesContainer } from '../charts/timeline';
import { ACCORDION_HEIGHT, BORDER_THICKNESS, TraceItemRow } from './trace_item_row';
import type { OnErrorClick, OnNodeClick } from './trace_waterfall_context';
import { TraceWaterfallContextProvider, useTraceWaterfallContext } from './trace_waterfall_context';
import type { TraceWaterfallItem } from './use_trace_waterfall';
import { WaterfallLegends } from './waterfall_legends';

export interface Props {
  traceItems: TraceItem[];
  showAccordion?: boolean;
  highlightedTraceId?: string;
  onClick?: OnNodeClick;
  onErrorClick?: OnErrorClick;
  scrollElement?: Element;
  getRelatedErrorsHref?: IWaterfallGetRelatedErrorsHref;
  isEmbeddable?: boolean;
  showLegend?: boolean;
  serviceName?: string;
}

export function TraceWaterfall({
  traceItems,
  showAccordion = true,
  highlightedTraceId,
  onClick,
  onErrorClick,
  scrollElement,
  getRelatedErrorsHref,
  isEmbeddable = false,
  showLegend = false,
  serviceName,
}: Props) {
  return (
    <TraceWaterfallContextProvider
      traceItems={traceItems}
      showAccordion={showAccordion}
      highlightedTraceId={highlightedTraceId}
      onClick={onClick}
      onErrorClick={onErrorClick}
      scrollElement={scrollElement}
      getRelatedErrorsHref={getRelatedErrorsHref}
      isEmbeddable={isEmbeddable}
      showLegend={showLegend}
      serviceName={serviceName}
    >
      <TraceWaterfallComponent />
    </TraceWaterfallContextProvider>
  );
}

function TraceWaterfallComponent() {
  const { euiTheme } = useEuiTheme();
  const {
    duration,
    rootItem,
    margin: { left, right },
    isEmbeddable,
    legends,
    colorBy,
    showLegend,
    serviceName,
  } = useTraceWaterfallContext();

  if (!rootItem) {
    return null;
  }

  return (
    <EuiFlexGroup direction="column">
      {showLegend && serviceName && (
        <EuiFlexItem>
          <WaterfallLegends serviceName={serviceName} legends={legends} type={colorBy} />
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        <div style={{ position: 'relative' }}>
          <div
            css={css`
              display: flex;
              position: sticky;
              top: ${isEmbeddable ? '0px' : 'var(--euiFixedHeadersOffset, 0)'};
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
              position: relative;
            `}
          >
            <TraceTree />
          </div>
        </div>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function TraceTree() {
  const { traceWaterfallMap, traceWaterfall, scrollElement } = useTraceWaterfallContext();
  const listRef = useRef<List>(null);
  const rowSizeMapRef = useRef(new Map<number, number>());
  const [accordionStatesMap, setAccordionStateMap] = useState(
    traceWaterfall.reduce<Record<string, EuiAccordionProps['forceState']>>((acc, item) => {
      acc[item.id] = 'open';
      return acc;
    }, {})
  );

  function toggleAccordionState(id: string) {
    setAccordionStateMap((prevStates) => ({
      ...prevStates,
      [id]: prevStates[id] === 'open' ? 'closed' : 'open',
    }));
  }

  const onRowLoad = (index: number, size: number) => {
    rowSizeMapRef.current.set(index, size);
  };

  const getRowSize = (index: number) => {
    return rowSizeMapRef.current.get(index) || ACCORDION_HEIGHT + BORDER_THICKNESS;
  };

  const onScroll = ({ scrollTop }: { scrollTop: number }) => {
    listRef.current?.scrollTo(scrollTop);
  };

  const visibleList = useMemo(
    () => convertTreeToList(traceWaterfallMap, accordionStatesMap, traceWaterfall[0]),
    [accordionStatesMap, traceWaterfall, traceWaterfallMap]
  );

  return (
    <WindowScroller onScroll={onScroll} scrollElement={scrollElement}>
      {({ registerChild }) => (
        <AutoSizer disableHeight>
          {({ width }) => (
            <div data-test-subj="waterfall" ref={registerChild}>
              <List
                ref={listRef}
                style={{ height: '100%' }}
                itemCount={visibleList.length}
                itemSize={getRowSize}
                height={window.innerHeight}
                width={width}
                itemData={{
                  traceList: visibleList,
                  onLoad: onRowLoad,
                  traceWaterfallMap,
                  accordionStatesMap,
                  toggleAccordionState,
                }}
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

const VirtualRow = React.memo(
  ({
    index,
    style,
    data,
  }: ListChildComponentProps<{
    traceList: TraceWaterfallItem[];
    traceWaterfallMap: Record<string, TraceWaterfallItem[]>;
    accordionStatesMap: Record<string, EuiAccordionProps['forceState']>;
    toggleAccordionState: (id: string) => void;
    onLoad: (index: number, size: number) => void;
  }>) => {
    const { onLoad, traceList, accordionStatesMap, toggleAccordionState, traceWaterfallMap } = data;

    const ref = React.useRef<HTMLDivElement | null>(null);
    useEffect(() => {
      onLoad(index, ref.current?.getBoundingClientRect().height ?? ACCORDION_HEIGHT);
    }, [index, onLoad]);

    const item = traceList[index];
    const children = traceWaterfallMap[item.id] || [];
    return (
      <div style={style} ref={ref}>
        <TraceItemRow
          key={item.id}
          item={item}
          childrenCount={children.length}
          state={accordionStatesMap[item.id] || 'open'}
          onToggle={toggleAccordionState}
        />
      </div>
    );
  },
  areEqual
);

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
