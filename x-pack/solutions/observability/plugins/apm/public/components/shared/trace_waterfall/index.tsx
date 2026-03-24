/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiAccordionProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  AutoSizer,
  List,
  CellMeasurerCache,
  CellMeasurer,
  WindowScroller,
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

/** Base props shared by all TraceWaterfall variants */
interface BaseTraceWaterfallProps {
  traceItems: TraceItem[];
  errors?: Error[];
  showAccordion?: boolean;
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
  showCriticalPath?: boolean;
  defaultShowCriticalPath?: boolean;
  onShowCriticalPathChange?: (value: boolean) => void;
  children?: React.ReactNode;
  entryTransactionId?: string;
}

/** Default: 'window' (page scroll). Use 'parent' for flyout. */
export type TraceWaterfallProps = BaseTraceWaterfallProps &
  (
    | { scrollStrategy?: 'window'; highlightedSpanId?: string }
    | { scrollStrategy: 'parent'; highlightedSpanId?: string; scrollToHighlightedOnMount?: boolean }
  );

export function TraceWaterfall(props: TraceWaterfallProps) {
  const {
    traceItems,
    errors,
    showAccordion = true,
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
    showCriticalPath,
    defaultShowCriticalPath,
    onShowCriticalPathChange,
    children,
    entryTransactionId,
  } = props;
  const highlightedSpanId = props.highlightedSpanId;
  const scrollToHighlightedOnMount =
    props.scrollStrategy === 'parent' ? props.scrollToHighlightedOnMount : undefined;

  return (
    <TraceWaterfallContextProvider
      traceItems={traceItems}
      showAccordion={showAccordion}
      highlightedSpanId={highlightedSpanId}
      scrollStrategy={props.scrollStrategy ?? 'window'}
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
      showCriticalPath={showCriticalPath}
      defaultShowCriticalPath={defaultShowCriticalPath}
      onShowCriticalPathChange={onShowCriticalPathChange}
      entryTransactionId={entryTransactionId}
      scrollToHighlightedOnMount={scrollToHighlightedOnMount}
    >
      <TraceWarning>
        <TraceWaterfallComponent />
      </TraceWarning>
      {children}
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
    showAccordion,
    isAccordionOpen,
    toggleAllAccordions,
    marks,
    showCriticalPath,
    setShowCriticalPath,
    showCriticalPathControl,
  } = useTraceWaterfallContext();

  const stickyTop = isEmbeddable
    ? '0px'
    : 'var(--kbnAppHeadersOffset, var(--euiFixedHeadersOffset, 0))';

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      css={css`
        flex: 1;
        min-height: 0;
      `}
    >
      {showCriticalPathControl && (
        <EuiFlexItem grow={false}>
          <CriticalPathToggle checked={showCriticalPath} onChange={setShowCriticalPath} />
        </EuiFlexItem>
      )}
      <EuiFlexItem
        css={css`
          min-height: 0;
        `}
      >
        <div
          css={css`
            display: flex;
            flex-direction: column;
            height: 100%;
          `}
        >
          <EuiFlexGroup
            direction="column"
            gutterSize="m"
            css={css`
              flex: none;
              position: sticky;
              top: ${stickyTop};
              z-index: ${euiTheme.levels.menu};
              background-color: ${euiTheme.colors.emptyShade};
              border-bottom: ${euiTheme.border.thin};
            `}
          >
            {showLegend && (
              <EuiFlexItem
                grow={false}
                css={css`
                  padding-top: ${euiTheme.size.base};
                `}
              >
                <WaterfallLegends serviceName={serviceName} legends={legends} type={colorBy} />
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiFlexGroup
                direction="row"
                gutterSize="none"
                responsive={false}
                css={css`
                  position: relative;
                `}
              >
                {showAccordion && (
                  <EuiFlexItem grow={false}>
                    <WaterfallAccordionButton
                      isOpen={isAccordionOpen}
                      onClick={toggleAllAccordions}
                    />
                  </EuiFlexItem>
                )}
                <EuiFlexItem>
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
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
          <div
            css={css`
              flex: 1;
              min-height: 0;
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
    accordionStatesMap,
    toggleAccordionState,
    highlightedSpanId,
    scrollStrategy = 'window',
    duration,
    margin: { left, right },
    marks,
    scrollToHighlightedOnMount,
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

  const totalContentHeight = useMemo(
    () =>
      visibleList.reduce((sum, _, index) => sum + rowHeightCache.current.rowHeight({ index }), 0),
    [visibleList]
  );

  const [scrollComplete, setScrollComplete] = useState(false);

  const scrollToIndex = useMemo(() => {
    if (!scrollToHighlightedOnMount || scrollStrategy !== 'parent') return undefined;
    if (scrollComplete || !highlightedSpanId || visibleList.length === 0) return undefined;
    const index = visibleList.findIndex((item) => item.id === highlightedSpanId);
    return index >= 0 ? index : undefined;
  }, [scrollToHighlightedOnMount, scrollStrategy, scrollComplete, highlightedSpanId, visibleList]);

  const onRowsRendered = useCallback(
    ({ startIndex, stopIndex }: { startIndex: number; stopIndex: number }) => {
      if (
        scrollToIndex !== undefined &&
        startIndex <= scrollToIndex &&
        scrollToIndex <= stopIndex
      ) {
        setScrollComplete(true);
      }
    },
    [scrollToIndex]
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

  const listProps = {
    ref: listRef,
    rowCount: visibleList.length,
    deferredMeasurementCache: rowHeightCache.current,
    rowHeight: rowHeightCache.current.rowHeight,
    rowRenderer,
    containerRole: 'rowgroup',
  };

  const verticalLines = (
    <VerticalLinesContainer
      xMax={duration}
      margins={{ top: 0, left, right, bottom: 0 }}
      marks={marks}
      height={totalContentHeight}
    />
  );

  if (scrollStrategy === 'window') {
    return (
      <div
        css={css`
          position: relative;
        `}
      >
        {verticalLines}
        <WindowScroller
          scrollElement={document.getElementById(APP_MAIN_SCROLL_CONTAINER_ID) ?? undefined}
        >
          {({ height, onChildScroll, scrollTop, registerChild }) => (
            <AutoSizer disableHeight>
              {({ width }) => (
                <div data-test-subj="waterfall" ref={registerChild}>
                  <List
                    ref={listRef}
                    autoHeight
                    height={height}
                    onScroll={onChildScroll}
                    scrollTop={scrollTop}
                    width={width}
                    rowCount={visibleList.length}
                    deferredMeasurementCache={rowHeightCache.current}
                    rowHeight={rowHeightCache.current.rowHeight}
                    rowRenderer={rowRenderer}
                    containerRole="rowgroup"
                  />
                </div>
              )}
            </AutoSizer>
          )}
        </WindowScroller>
      </div>
    );
  }

  return (
    <div
      css={css`
        position: relative;
        height: 100%;
      `}
    >
      {verticalLines}
      <AutoSizer>
        {({ width, height }) => (
          <div data-test-subj="waterfall">
            <List
              {...listProps}
              scrollToIndex={scrollToIndex}
              scrollToAlignment="center"
              onRowsRendered={onRowsRendered}
              height={height}
              width={width}
            />
          </div>
        )}
      </AutoSizer>
    </div>
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
      <div style={style} role="row">
        <div role="gridcell">
          <TraceItemRow
            key={item.id}
            item={item}
            childrenCount={childrenCount}
            state={accordionState}
            onToggle={onToggle}
          />
        </div>
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
