/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiPaletteColorBlind } from '@elastic/eui';
import { useMemo } from 'react';
import type { TraceItem } from '../../../../common/waterfall/unified_trace_item';
import type { IWaterfallLegend } from '../../app/transaction_details/waterfall_with_summary/waterfall_container/waterfall/waterfall_helpers/waterfall_helpers';
import { WaterfallLegendType } from '../../app/transaction_details/waterfall_with_summary/waterfall_container/waterfall/waterfall_helpers/waterfall_helpers';

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

export function getServiceLegends(traceItems: TraceItem[]): IWaterfallLegend[] {
  const allServiceNames = new Set(traceItems.map((item) => item.serviceName));
  const palette = euiPaletteColorBlind({
    rotations: Math.ceil(allServiceNames.size / 10),
  });

  return Array.from(allServiceNames).map((serviceName, index) => ({
    type: WaterfallLegendType.ServiceName,
    value: serviceName,
    color: palette[index],
  }));
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
  const rootStartMicroseconds = rootItem.timestampUs;

  function getTraceWaterfallItem(item: TraceItem, depth: number, parent?: TraceWaterfallItem) {
    const startMicroseconds = item.timestampUs;
    const traceWaterfallItem: TraceWaterfallItem = {
      ...item,
      depth,
      offset: startMicroseconds - rootStartMicroseconds,
      skew: getClockSkew({ itemTimestamp: startMicroseconds, itemDuration: item.duration, parent }),
      color: serviceColorsMap[item.serviceName],
    };
    const result = [traceWaterfallItem];
    const sortedChildren =
      parentChildMap[item.id]?.sort((a, b) => a.timestampUs - b.timestampUs) || [];

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
    const parentTimestamp = parent.timestampUs;
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
