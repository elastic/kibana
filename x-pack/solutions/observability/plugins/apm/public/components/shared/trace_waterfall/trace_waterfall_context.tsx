/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo } from 'react';
import type { TraceItem } from '../../../../common/waterfall/unified_trace_item';
import { TOGGLE_BUTTON_WIDTH } from './toggle_accordion_button';
import { ACCORDION_PADDING_LEFT } from './trace_item_row';
import type { TraceWaterfallItem } from './use_trace_waterfall';
import { useTraceWaterfall } from './use_trace_waterfall';
import type { IWaterfallGetRelatedErrorsHref } from '../../app/transaction_details/waterfall_with_summary/waterfall_container/waterfall/waterfall_helpers/waterfall_helpers';

interface TraceWaterfallContextProps {
  duration: number;
  traceWaterfall: TraceWaterfallItem[];
  rootItem?: TraceItem;
  margin: { left: number; right: number };
  traceWaterfallMap: Record<string, TraceWaterfallItem[]>;
  showAccordion: boolean;
  onClick?: OnNodeClick;
  onErrorClick?: OnErrorClick;
  highlightedTraceId?: string;
  scrollElement?: Element;
  getRelatedErrorsHref?: IWaterfallGetRelatedErrorsHref;
  isEmbeddable: boolean;
}

export const TraceWaterfallContext = createContext<TraceWaterfallContextProps>({
  duration: 0,
  traceWaterfall: [],
  rootItem: undefined,
  margin: { left: 0, right: 0 },
  traceWaterfallMap: {},
  showAccordion: true,
  isEmbeddable: false,
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
  scrollElement,
  getRelatedErrorsHref,
  isEmbeddable,
}: {
  children: React.ReactNode;
  traceItems: TraceItem[];
  showAccordion: boolean;
  highlightedTraceId?: string;
  onClick?: OnNodeClick;
  onErrorClick?: OnErrorClick;
  scrollElement?: Element;
  getRelatedErrorsHref?: IWaterfallGetRelatedErrorsHref;
  isEmbeddable: boolean;
}) {
  const { duration, traceWaterfall, maxDepth, rootItem } = useTraceWaterfall({
    traceItems,
  });

  const left = TOGGLE_BUTTON_WIDTH + ACCORDION_PADDING_LEFT * maxDepth;
  const right = 40;

  const traceWaterfallMap = useMemo(() => groupByParent(traceWaterfall), [traceWaterfall]);

  return (
    <TraceWaterfallContext.Provider
      value={{
        duration,
        rootItem,
        traceWaterfall,
        margin: { left: showAccordion ? Math.max(100, left) : left, right },
        traceWaterfallMap,
        showAccordion,
        onClick,
        onErrorClick,
        highlightedTraceId,
        scrollElement,
        getRelatedErrorsHref,
        isEmbeddable,
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
