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
import type {
  IWaterfallGetRelatedErrorsHref,
  WaterfallGetServiceBadgeHref,
} from '../../../../common/waterfall/typings';
import type { IWaterfallLegend } from '../../../../common/waterfall/legend';
import { WaterfallLegendType } from '../../../../common/waterfall/legend';
import type { TraceItem } from '../../../../common/waterfall/unified_trace_item';
import { TOGGLE_BUTTON_WIDTH } from './toggle_accordion_button';
import { ACCORDION_PADDING_LEFT } from './trace_item_row';
import { TraceDataState, type TraceWaterfallItem } from './use_trace_waterfall';
import { useTraceWaterfall } from './use_trace_waterfall';
import { getCriticalPath, type CriticalPathSegment } from './critical_path';
import type { ErrorMark } from '../charts/timeline/marker/error_marker';
import { getAgentMarks } from '../charts/timeline/marker/get_agent_marks';
import type { AgentMark } from '../charts/timeline/marker/agent_marker';

export type TraceWaterfallScrollStrategy = 'parent' | 'window';

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
  contextSpanIds?: string[];
  selectedSpanId?: string;
  scrollToContextOnMount?: boolean;
  getRelatedErrorsHref?: IWaterfallGetRelatedErrorsHref;
  getServiceBadgeHref?: WaterfallGetServiceBadgeHref;
  isEmbeddable: boolean;
  legends: IWaterfallLegend[];
  colorBy: WaterfallLegendType;
  showLegend: boolean;
  serviceName?: string;
  message?: string;
  marks: Array<AgentMark | ErrorMark>;
  errorMarks: ErrorMark[];
  agentMarks: AgentMark[];
  scrollElement?: Element;
  scrollStrategy: TraceWaterfallScrollStrategy;
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
  marks: [],
  errorMarks: [],
  agentMarks: [],
  scrollElement: undefined,
  scrollStrategy: 'window',
  getServiceBadgeHref: undefined,
});

export interface OnNodeClickOptions {
  flyoutDetailTab?: string;
}
export type OnNodeClick = (id: string, options?: OnNodeClickOptions) => void;
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
  contextSpanIds?: string[];
  scrollStrategy?: TraceWaterfallScrollStrategy;
  onClick?: OnNodeClick;
  onErrorClick?: OnErrorClick;
  getServiceBadgeHref?: WaterfallGetServiceBadgeHref;
  getRelatedErrorsHref?: IWaterfallGetRelatedErrorsHref;
  isEmbeddable: boolean;
  showLegend: boolean;
  serviceName?: string;
  isFiltered?: boolean;
  errors?: Error[];
  agentMarks?: Record<string, number>;
  showCriticalPathControl?: boolean;
  showCriticalPath?: boolean;
  defaultShowCriticalPath?: boolean;
  onShowCriticalPathChange?: (value: boolean) => void;
  entryTransactionId?: string;
  scrollToContextOnMount?: boolean;
  scrollElement?: Element;
}

const MAX_DEPTH_OPEN_LIMIT = 2;

export function TraceWaterfallContextProvider({
  children,
  traceItems,
  showAccordion,
  contextSpanIds,
  scrollStrategy = 'window',
  onClick,
  onErrorClick,
  getServiceBadgeHref,
  scrollElement,
  getRelatedErrorsHref,
  isEmbeddable,
  showLegend,
  serviceName,
  isFiltered,
  errors,
  agentMarks,
  showCriticalPathControl,
  showCriticalPath: controlledValue,
  defaultShowCriticalPath = false,
  onShowCriticalPathChange,
  entryTransactionId,
  scrollToContextOnMount,
}: Props) {
  const { duration, traceWaterfall, rootItem, legends, colorBy, traceState, message, errorMarks } =
    useTraceWaterfall({
      traceItems,
      isFiltered,
      errors,
      onErrorClick,
      entryTransactionId,
    });

  const [selectedSpanId, setSelectedSpanId] = useState<string | undefined>();

  const handleNodeClick = useCallback<OnNodeClick>(
    (id, options) => {
      setSelectedSpanId(id);
      onClick?.(id, options);
    },
    [onClick]
  );

  const [uncontrolledValue, setUncontrolledValue] = useState(defaultShowCriticalPath);
  const isCriticalPathControlled = controlledValue !== undefined;
  const showCriticalPath = isCriticalPathControlled ? controlledValue : uncontrolledValue;

  const setShowCriticalPath = useCallback(
    (newValue: boolean) => {
      onShowCriticalPathChange?.(newValue);
      if (!isCriticalPathControlled) {
        setUncontrolledValue(newValue);
      }
    },
    [isCriticalPathControlled, onShowCriticalPathChange]
  );
  const maxLevelOpen = traceWaterfall.length > 500 ? MAX_DEPTH_OPEN_LIMIT : traceWaterfall.length;
  const [isAccordionOpen, setAccordionOpen] = useState(true);
  const [accordionStatesMap, setAccordionStateMap] = useState<
    Record<string, EuiAccordionProps['forceState']>
  >(() => {
    const ancestorIds = new Set(
      contextSpanIds?.flatMap((id) => [...getAncestorIds(traceWaterfall, id)]) ?? []
    );

    return traceWaterfall.reduce<Record<string, EuiAccordionProps['forceState']>>((acc, item) => {
      acc[item.id] = item.depth < maxLevelOpen || ancestorIds.has(item.id) ? 'open' : 'closed';
      return acc;
    }, {});
  });

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

  const left = TOGGLE_BUTTON_WIDTH + ACCORDION_PADDING_LEFT;
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

  const marks = useMemo(
    () => [...getAgentMarks(agentMarks), ...errorMarks],
    [agentMarks, errorMarks]
  );

  return (
    <TraceWaterfallContext.Provider
      value={{
        traceState,
        duration,
        rootItem,
        traceWaterfall,
        margin: { left: showAccordion ? Math.max(60, left) : left, right },
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
        onClick: onClick ? handleNodeClick : undefined,
        onErrorClick,
        getServiceBadgeHref,
        contextSpanIds,
        selectedSpanId,
        scrollToContextOnMount,
        getRelatedErrorsHref,
        isEmbeddable,
        legends,
        colorBy,
        showLegend,
        serviceName,
        message,
        marks,
        errorMarks,
        agentMarks: getAgentMarks(agentMarks),
        scrollElement,
        scrollStrategy,
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

/**
 * Returns the set of ancestor IDs for a given target item.
 * Used to expand collapsed accordion nodes so the target becomes visible.
 */
export function getAncestorIds(items: TraceWaterfallItem[], targetId?: string): Set<string> {
  if (!targetId) {
    return new Set();
  }

  const itemById = new Map(items.map((item) => [item.id, item]));
  const ancestors = new Set<string>();

  let current = itemById.get(targetId);
  while (current?.parentId) {
    ancestors.add(current.parentId);
    current = itemById.get(current.parentId);
  }

  return ancestors;
}
