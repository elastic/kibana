/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiAccordionProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useMemo, useRef } from 'react';
import {
  AutoSizer,
  WindowScroller,
  List,
  CellMeasurerCache,
  CellMeasurer,
} from 'react-virtualized';
import type { ListRowRenderer, ListRowProps } from 'react-virtualized';
import { APP_MAIN_SCROLL_CONTAINER_ID } from '@kbn/core-chrome-layout-constants';
import type { Error } from '@kbn/apm-types';
import type { IWaterfallGetRelatedErrorsHref } from '../../../../common/waterfall/typings';
import type { TraceItem } from '../../../../common/waterfall/unified_trace_item';
import { TimelineAxisContainer, VerticalLinesContainer } from '../charts/timeline';
import { ACCORDION_HEIGHT, BORDER_THICKNESS, TraceItemRow } from './trace_item_row';
import { CriticalPathToggle } from './critical_path';
import type { OnErrorClick, OnNodeClick } from './trace_waterfall_context';
import { TraceWaterfallContextProvider, useTraceWaterfallContext } from './trace_waterfall_context';
import type { TraceWaterfallItem } from './use_trace_waterfall';
import { TraceWarning } from './trace_warning';
import { WaterfallLegends } from './waterfall_legends';
import { WaterfallAccordionButton } from './waterfall_accordion_button';

export interface Props {
  traceItems: TraceItem[];
  errors?: Error[];
  showAccordion?: boolean;
  highlightedTraceId?: string;
  onClick?: OnNodeClick;
  onErrorClick?: OnErrorClick;
  scrollElement?: Element;
  getRelatedErrorsHref?: IWaterfallGetRelatedErrorsHref;
  isEmbeddable?: boolean;
  showLegend?: boolean;
  serviceName?: string;
  isFiltered?: boolean;
  agentMarks?: Record<string, number>;
  showCriticalPathControl?: boolean;
}

export function TraceWaterfall({
  traceItems,
  errors,
  showAccordion = true,
  highlightedTraceId,
  onClick,
  onErrorClick,
  scrollElement,
  getRelatedErrorsHref,
  isEmbeddable = false,
  showLegend = false,
  serviceName,
  isFiltered,
  agentMarks,
  showCriticalPathControl = false,
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
      isFiltered={isFiltered}
      errors={errors}
      agentMarks={agentMarks}
      showCriticalPathControl={showCriticalPathControl}
    >
      <TraceWarning>
        <TraceWaterfallComponent />
      </TraceWarning>
    </TraceWaterfallContextProvider>
  );
}

function TraceWaterfallComponent() {
  const { euiTheme } = useEuiTheme();
  const {
    duration,
    margin: { left, right },
    isEmbeddable,
    legends,
    colorBy,
    showLegend,
    serviceName,
    errorMarks,
    showAccordion,
    isAccordionOpen,
    toggleAllAccordions,
    agentMarks,
    showCriticalPath,
    setShowCriticalPath,
    showCriticalPathControl,
  } = useTraceWaterfallContext();

  const marks = useMemo(() => {
    return [...agentMarks, ...errorMarks];
  }, [agentMarks, errorMarks]);

  return (
    <EuiFlexGroup direction="column">
      {showCriticalPathControl && (
        <EuiFlexItem>
          <CriticalPathToggle checked={showCriticalPath} onChange={setShowCriticalPath} />
        </EuiFlexItem>
      )}
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
            {showAccordion && (
              <WaterfallAccordionButton isOpen={isAccordionOpen} onClick={toggleAllAccordions} />
            )}
            <TimelineAxisContainer
              xMax={duration}
              margins={{
                top: 40,
                left,
                right,
                bottom: 0,
              }}
              numberOfTicks={3}
              marks={marks}
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
            marks={marks}
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
  const {
    traceWaterfallMap,
    traceWaterfall,
    scrollElement,
    accordionStatesMap,
    toggleAccordionState,
  } = useTraceWaterfallContext();

  const listRef = useRef<List>(null);

  const rowHeightCache = useRef(
    new CellMeasurerCache({
      fixedWidth: true,
      defaultHeight: ACCORDION_HEIGHT + BORDER_THICKNESS,
    })
  );

  const visibleList = useMemo(
    () => convertTreeToList(traceWaterfallMap, accordionStatesMap, traceWaterfall[0]),
    [accordionStatesMap, traceWaterfall, traceWaterfallMap]
  );

  const rowRenderer: ListRowRenderer = useCallback(
    ({ index, style, key, parent }) => {
      const item = visibleList[index];
      const children = traceWaterfallMap[item.id] || [];

      return (
        <VirtualRow
          key={key}
          index={index}
          style={style}
          parent={parent}
          rowHeightCache={rowHeightCache.current}
          item={item}
          childrenCount={children.length}
          accordionState={accordionStatesMap[item.id] || 'open'}
          onToggle={toggleAccordionState}
        />
      );
    },
    [visibleList, traceWaterfallMap, accordionStatesMap, toggleAccordionState]
  );

  return (
    <WindowScroller
      scrollElement={
        scrollElement ?? document.getElementById(APP_MAIN_SCROLL_CONTAINER_ID) ?? undefined
      }
    >
      {({ height, isScrolling, onChildScroll, scrollTop, registerChild }) => (
        <AutoSizer disableHeight>
          {({ width }) => (
            <div data-test-subj="waterfall" ref={registerChild}>
              <List
                ref={listRef}
                autoHeight
                height={height}
                isScrolling={isScrolling}
                onScroll={onChildScroll}
                scrollTop={scrollTop}
                width={width}
                rowCount={visibleList.length}
                deferredMeasurementCache={rowHeightCache.current}
                rowHeight={rowHeightCache.current.rowHeight}
                rowRenderer={rowRenderer}
              />
            </div>
          )}
        </AutoSizer>
      )}
    </WindowScroller>
  );
}

interface VirtualRowProps extends Pick<ListRowProps, 'index' | 'style' | 'parent'> {
  rowHeightCache: CellMeasurerCache;
  item: TraceWaterfallItem;
  childrenCount: number;
  accordionState: EuiAccordionProps['forceState'];
  onToggle: (id: string) => void;
}

function VirtualRow({
  index,
  style,
  parent,
  rowHeightCache,
  item,
  childrenCount,
  accordionState,
  onToggle,
}: VirtualRowProps) {
  return (
    <CellMeasurer cache={rowHeightCache} parent={parent} rowIndex={index}>
      <div style={style}>
        <TraceItemRow
          key={item.id}
          item={item}
          childrenCount={childrenCount}
          state={accordionState}
          onToggle={onToggle}
        />
      </div>
    </CellMeasurer>
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
