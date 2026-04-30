/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type React from 'react';
import type { List } from 'react-virtualized';
import type { TraceWaterfallItem } from './use_trace_waterfall';

export function useScrollToOrigin({
  contextSpanIds,
  visibleList,
  listRef,
  scrollToOriginRef,
  setIsContextSpanVisible,
}: {
  contextSpanIds?: string[];
  visibleList: TraceWaterfallItem[];
  listRef: React.RefObject<List>;
  scrollToOriginRef: React.MutableRefObject<() => void>;
  setIsContextSpanVisible: (visible: boolean) => void;
}) {
  const contextSpanIndex = useMemo(() => {
    const target = contextSpanIds?.[0];
    if (!target) return undefined;
    const idx = visibleList.findIndex((item) => item.id === target);
    return idx >= 0 ? idx : undefined;
  }, [contextSpanIds, visibleList]);

  scrollToOriginRef.current = () => {
    if (contextSpanIndex !== undefined) {
      listRef.current?.scrollToRow(contextSpanIndex);
    }
  };

  const onScrolled = useCallback(
    ({ startIndex, stopIndex }: { startIndex: number; stopIndex: number }) => {
      if (contextSpanIndex !== undefined) {
        setIsContextSpanVisible(startIndex <= contextSpanIndex && contextSpanIndex <= stopIndex);
      }
    },
    [contextSpanIndex, setIsContextSpanVisible]
  );

  return { onScrolled };
}
