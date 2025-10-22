/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TraceItem } from './unified_trace_item';

export function getTraceParentChildrenMap<T extends TraceItem>(
  traceItems: T[],
  filteredTrace: boolean
) {
  if (traceItems.length === 0) {
    return {};
  }

  const traceMap = traceItems.reduce<Record<string, T[]>>((acc, item) => {
    if (item.parentId) {
      (acc[item.parentId] ??= []).push(item);
    } else {
      (acc.root ??= [])[0] = item;
    }
    return acc;
  }, {});

  // If filtered trace, elect the earliest arriving span as the root if there is no root found already
  if (filteredTrace && !traceMap.root) {
    const root = traceItems
      .slice(1)
      .reduce(
        (acc, span) =>
          acc.timestampUs <= span.timestampUs || acc.id === span.parentId ? acc : span,
        traceItems[0]
      );

    traceMap.root = [root];
  }

  return traceMap;
}
