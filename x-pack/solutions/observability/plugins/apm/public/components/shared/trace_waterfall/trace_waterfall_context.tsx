/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo, useState } from 'react';
import type { EuiAccordionProps } from '@elastic/eui';
import type { TraceItem } from '../../../../common/waterfall/unified_trace_item';
import type { TraceWaterfallItem } from './use_trace_waterfall';
import { useTraceWaterfall } from './use_trace_waterfall';
import { TOGGLE_BUTTON_WIDTH } from './toggle_accordion_button';
import { ACCORDION_PADDING_LEFT } from './trace_item_row';

interface TraceWaterfallContextProps {
  duration: number;
  traceWaterfall: TraceWaterfallItem[];
  // maxDepth: number;
  rootItem?: TraceItem;
  margin: { left: number; right: number };
  traceWaterfallMap: Record<string, TraceWaterfallItem[]>;
  accordionStatesMap: Record<string, EuiAccordionProps['forceState']>;
  toggleAccordionState: (id: string) => void;
  showAccordion: boolean;
  onClick?: OnNodeClick;
  onErrorClick?: OnErrorClick;
  highlightedTraceId?: string;
}

export const TraceWaterfallContext = createContext<TraceWaterfallContextProps>({
  duration: 0,
  // maxDepth: 0,
  traceWaterfall: [],
  rootItem: undefined,
  margin: { left: 0, right: 0 },
  traceWaterfallMap: {},
  accordionStatesMap: {},
  toggleAccordionState: () => {},
  showAccordion: true,
});

export type OnNodeClick = (id: string) => void;
export type OnErrorClick = (params: { traceId: string; docId: string }) => void;

export function TraceWaterfallContextProvider({
  children,
  traceItems,
  showAccordion,
  highlightedTraceId,
  onClick,
  onErrorClick,
}: {
  children: React.ReactNode;
  traceItems: TraceItem[];
  showAccordion: boolean;
  highlightedTraceId?: string;
  onClick?: OnNodeClick;
  onErrorClick?: OnErrorClick;
}) {
  const { duration, traceWaterfall, maxDepth, rootItem } = useTraceWaterfall({
    traceItems,
  });

  const left = TOGGLE_BUTTON_WIDTH + ACCORDION_PADDING_LEFT * maxDepth;
  const right = 40;

  const traceWaterfallMap = useMemo(() => groupByParent(traceWaterfall), [traceWaterfall]);

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

  return (
    <TraceWaterfallContext.Provider
      value={{
        duration,
        rootItem,
        traceWaterfall,
        margin: { left, right },
        traceWaterfallMap,
        accordionStatesMap,
        toggleAccordionState,
        showAccordion,
        onClick,
        onErrorClick,
        highlightedTraceId,
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
