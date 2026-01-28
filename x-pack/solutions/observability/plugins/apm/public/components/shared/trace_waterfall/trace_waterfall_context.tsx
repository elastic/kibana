/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { groupBy } from 'lodash';
import type { EuiAccordionProps } from '@elastic/eui';
import type { Error } from '@kbn/apm-types';
import type { IWaterfallGetRelatedErrorsHref } from '../../../../common/waterfall/typings';
import type { IWaterfallLegend } from '../../../../common/waterfall/legend';
import { WaterfallLegendType } from '../../../../common/waterfall/legend';
import type { TraceItem } from '../../../../common/waterfall/unified_trace_item';
import { TOGGLE_BUTTON_WIDTH } from './toggle_accordion_button';
import { ACCORDION_PADDING_LEFT } from './trace_item_row';
import { TraceDataState, type TraceWaterfallItem } from './use_trace_waterfall';
import { useTraceWaterfall } from './use_trace_waterfall';
import type { ErrorMark } from '../../app/transaction_details/waterfall_with_summary/waterfall_container/marks/get_error_marks';
import {
  getAgentMarks,
  type AgentMark,
} from '../../app/transaction_details/waterfall_with_summary/waterfall_container/marks/get_agent_marks';
import { getCriticalPath, type CriticalPathSegment } from './critical_path';

export interface TraceWaterfallContextProps {
  duration: number;
  traceState: TraceDataState;
  traceWaterfall: TraceWaterfallItem[];
  rootItem?: TraceItem;
  margin: { left: number; right: number };
  traceWaterfallMap: Record<string, TraceWaterfallItem[]>;
  criticalPathSegmentsById: Record<string, CriticalPathSegment<TraceWaterfallItem>[]>;
  showAccordion: boolean;
  isAccordionOpen: boolean;
  accordionStatesMap: Record<string, EuiAccordionProps['forceState']>;
  toggleAccordionState: (id: string) => void;
  toggleAllAccordions: () => void;
  showCriticalPath: boolean;
  setShowCriticalPath: (value: boolean) => void;
  showCriticalPathControl?: boolean;
  onClick?: OnNodeClick;
  onErrorClick?: OnErrorClick;
  highlightedTraceId?: string;
  scrollElement?: Element;
  getRelatedErrorsHref?: IWaterfallGetRelatedErrorsHref;
  isEmbeddable: boolean;
  legends: IWaterfallLegend[];
  colorBy: WaterfallLegendType;
  showLegend: boolean;
  serviceName?: string;
  message?: string;
  errorMarks: ErrorMark[];
  agentMarks: AgentMark[];
}

export const TraceWaterfallContext = createContext<TraceWaterfallContextProps>({
  duration: 0,
  traceState: TraceDataState.Empty,
  traceWaterfall: [],
  rootItem: undefined,
  margin: { left: 0, right: 0 },
  traceWaterfallMap: {},
  criticalPathSegmentsById: {},
  showAccordion: true,
  isAccordionOpen: true,
  accordionStatesMap: {},
  toggleAccordionState: () => {},
  toggleAllAccordions: () => {},
  showCriticalPath: false,
  setShowCriticalPath: () => {},
  showCriticalPathControl: false,
  isEmbeddable: false,
  legends: [],
  colorBy: WaterfallLegendType.ServiceName,
  showLegend: false,
  serviceName: '',
  errorMarks: [],
  agentMarks: [],
});

export type OnNodeClick = (id: string) => void;
export type OnErrorClick = (params: {
  traceId: string;
  docId: string;
  errorCount: number;
  errorDocId?: string;
  docIndex?: string;
}) => void;

interface Props {
  children: React.ReactNode;
  traceItems: TraceItem[];
  showAccordion: boolean;
  highlightedTraceId?: string;
  onClick?: OnNodeClick;
  onErrorClick?: OnErrorClick;
  scrollElement?: Element;
  getRelatedErrorsHref?: IWaterfallGetRelatedErrorsHref;
  isEmbeddable: boolean;
  showLegend: boolean;
  serviceName?: string;
  isFiltered?: boolean;
  errors?: Error[];
  agentMarks?: Record<string, number>;
  showCriticalPathControl?: boolean;
}

export function TraceWaterfallContextProvider({
  children,
  traceItems,
  showAccordion,
  highlightedTraceId,
  onClick,
  onErrorClick,
  scrollElement,
  getRelatedErrorsHref,
  isEmbeddable,
  showLegend,
  serviceName,
  isFiltered,
  errors,
  agentMarks,
  showCriticalPathControl,
}: Props) {
  const {
    duration,
    traceWaterfall,
    maxDepth,
    rootItem,
    legends,
    colorBy,
    traceState,
    message,
    errorMarks,
  } = useTraceWaterfall({
    traceItems,
    isFiltered,
    errors,
    onErrorClick,
  });

  const [showCriticalPath, setShowCriticalPath] = useState(false);
  const [isAccordionOpen, setAccordionOpen] = useState(true);
  const [accordionStatesMap, setAccordionStateMap] = useState<
    Record<string, EuiAccordionProps['forceState']>
  >(() =>
    traceWaterfall.reduce<Record<string, EuiAccordionProps['forceState']>>((acc, item) => {
      acc[item.id] = 'open';
      return acc;
    }, {})
  );

  const toggleAccordionState = useCallback((id: string) => {
    setAccordionStateMap((prevStates) => ({
      ...prevStates,
      [id]: prevStates[id] === 'open' ? 'closed' : 'open',
    }));
  }, []);

  const toggleAllAccordions = useCallback(() => {
    setAccordionStateMap((prevAccordionStates) =>
      Object.keys(prevAccordionStates).reduce<Record<string, EuiAccordionProps['forceState']>>(
        (acc, id) => {
          acc[id] = isAccordionOpen ? 'closed' : 'open';
          return acc;
        },
        {}
      )
    );

    setAccordionOpen((prev) => !prev);
  }, [isAccordionOpen]);

  const left = TOGGLE_BUTTON_WIDTH + ACCORDION_PADDING_LEFT * maxDepth;
  const right = 40;

  const fullTraceWaterfallMap = useMemo(() => groupByParent(traceWaterfall), [traceWaterfall]);

  const criticalPathSegmentsById = useMemo(() => {
    if (!showCriticalPath) {
      return {};
    }

    const root = traceWaterfall[0];
    if (!root) {
      return {};
    }

    const criticalPath = getCriticalPath(root, fullTraceWaterfallMap);
    return groupBy(criticalPath.segments, (segment) => segment.item.id);
  }, [fullTraceWaterfallMap, showCriticalPath, traceWaterfall]);

  const traceWaterfallMap = useMemo(() => {
    if (!showCriticalPath) {
      return fullTraceWaterfallMap;
    }

    return filterMapByCriticalPath(fullTraceWaterfallMap, criticalPathSegmentsById);
  }, [criticalPathSegmentsById, fullTraceWaterfallMap, showCriticalPath]);

  return (
    <TraceWaterfallContext.Provider
      value={{
        traceState,
        duration,
        rootItem,
        traceWaterfall,
        margin: { left: showAccordion ? Math.max(100, left) : left, right },
        traceWaterfallMap,
        criticalPathSegmentsById,
        showAccordion,
        isAccordionOpen,
        accordionStatesMap,
        toggleAccordionState,
        toggleAllAccordions,
        showCriticalPath,
        setShowCriticalPath,
        showCriticalPathControl,
        onClick,
        onErrorClick,
        highlightedTraceId,
        scrollElement,
        getRelatedErrorsHref,
        isEmbeddable,
        legends,
        colorBy,
        showLegend,
        serviceName,
        message,
        errorMarks,
        agentMarks: getAgentMarks(agentMarks),
      }}
    >
      {children}
    </TraceWaterfallContext.Provider>
  );
}

export function useTraceWaterfallContext() {
  const context = useContext(TraceWaterfallContext);
  if (!context) {
    throw new Error('useTraceWaterfallContext must be used within a TraceWaterfallContextProvider');
  }
  return context;
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

export function filterMapByCriticalPath(
  map: Record<string, TraceWaterfallItem[]>,
  criticalPathSegmentsById: Record<string, CriticalPathSegment<TraceWaterfallItem>[]>
): Record<string, TraceWaterfallItem[]> {
  const validChildIds = new Set(Object.keys(criticalPathSegmentsById));

  const result: Record<string, TraceWaterfallItem[]> = {};
  for (const parentId of Object.keys(map)) {
    result[parentId] = map[parentId].filter((child) => validChildIds.has(child.id));
  }

  return result;
}
