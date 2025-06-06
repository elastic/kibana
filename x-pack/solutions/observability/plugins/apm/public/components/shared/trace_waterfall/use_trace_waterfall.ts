/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiPaletteColorBlind } from '@elastic/eui';
import { useMemo } from 'react';
import type { TraceItem } from '../../../../common/waterfall/unified_trace_item';

export interface TraceWaterfallItem extends TraceItem {
  depth: number;
  offset: number;
  skew: number;
  color: string;
}

export function useTraceWaterfall({ traceItems }: { traceItems: TraceItem[] }) {
  const waterfall = useMemo(() => {
    const serviceColors = getServiceColors(traceItems);
    const traceParentChildrenMap = getTraceParentChildrenMap(traceItems);
    const rootItem = traceParentChildrenMap.root?.[0];
    const traceWaterfall = rootItem
      ? getTraceWaterfall(rootItem, traceParentChildrenMap, serviceColors)
      : [];

    return {
      rootItem,
      traceWaterfall,
      duration: getTraceWaterfallDuration(traceWaterfall),
      maxDepth: Math.max(...traceWaterfall.map((item) => item.depth)),
    };
  }, [traceItems]);

  return waterfall;
}

export function getServiceColors(traceItems: TraceItem[]) {
  const allServiceNames = new Set(traceItems.map((item) => item.serviceName));
  const palette = euiPaletteColorBlind({
    rotations: Math.ceil(allServiceNames.size / 10),
  });
  return Array.from(allServiceNames).reduce<Record<string, string>>((acc, serviceName, idx) => {
    acc[serviceName] = palette[idx];
    return acc;
  }, {});
}

export function getTraceParentChildrenMap(traceItems: TraceItem[]) {
  const traceMap = traceItems.reduce<Record<string, TraceItem[]>>((acc, item) => {
    if (!item.parentId) {
      acc.root = [item];
    } else {
      if (!acc[item.parentId]) {
        acc[item.parentId] = [];
      }
      acc[item.parentId].push(item);
    }
    return acc;
  }, {});

  return traceMap;
}

export function getTraceWaterfall(
  rootItem: TraceItem,
  parentChildMap: Record<string, TraceItem[]>,
  serviceColorsMap: Record<string, string>
): TraceWaterfallItem[] {
  const rootStartMicroseconds = toMicroseconds(rootItem.timestamp);

  function getTraceWaterfallItem(item: TraceItem, depth: number, parent?: TraceWaterfallItem) {
    const startMicroseconds = toMicroseconds(item.timestamp);
    const traceWaterfallItem: TraceWaterfallItem = {
      ...item,
      depth,
      offset: startMicroseconds - rootStartMicroseconds,
      skew: getClockSkew({ itemTimestamp: startMicroseconds, itemDuration: item.duration, parent }),
      color: serviceColorsMap[item.serviceName],
    };
    const result = [traceWaterfallItem];
    const sortedChildren =
      parentChildMap[item.id]?.sort((a, b) => a.timestamp.localeCompare(b.timestamp)) || [];

    sortedChildren.forEach((child) => {
      result.push(...getTraceWaterfallItem(child, depth + 1, traceWaterfallItem));
    });
    return result;
  }

  return getTraceWaterfallItem(rootItem, 0);
}

export function getClockSkew({
  itemTimestamp,
  itemDuration,
  parent,
}: {
  itemTimestamp: number;
  itemDuration: number;
  parent?: TraceWaterfallItem;
}) {
  let skew = 0;
  if (parent) {
    const parentTimestamp = toMicroseconds(parent.timestamp);
    const parentStart = parentTimestamp + parent.skew;

    const offsetStart = parentStart - itemTimestamp;
    if (offsetStart > 0) {
      const latency = Math.max(parent.duration - itemDuration, 0) / 2;
      skew = offsetStart + latency;
    }
  }
  return skew;
}

export function getTraceWaterfallDuration(flattenedTraceWaterfall: TraceWaterfallItem[]) {
  return Math.max(
    ...flattenedTraceWaterfall.map((item) => item.offset + item.skew + item.duration),
    0
  );
}

const toMicroseconds = (ts: string) => new Date(ts).getTime() * 1000; // Convert ms to us
