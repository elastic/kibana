/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiPaletteColorBlind } from '@elastic/eui';
import { useMemo } from 'react';
import type { IWaterfallLegend } from '../../../../common/waterfall/legend';
import { WaterfallLegendType } from '../../../../common/waterfall/legend';
import type { TraceItem } from '../../../../common/waterfall/unified_trace_item';

export interface TraceWaterfallItem extends TraceItem {
  depth: number;
  offset: number;
  skew: number;
  color: string;
}

export function useTraceWaterfall({ traceItems }: { traceItems: TraceItem[] }) {
  const waterfall = useMemo(() => {
    const legends = getLegends(traceItems);
    const colorBy =
      legends.filter(({ type }) => type === WaterfallLegendType.ServiceName).length > 1
        ? WaterfallLegendType.ServiceName
        : WaterfallLegendType.SpanType;
    const colorMap = createColorLookupMap(legends);
    const traceParentChildrenMap = getTraceParentChildrenMap(traceItems);
    const rootItem = traceParentChildrenMap.root?.[0];
    const traceWaterfall = rootItem
      ? getTraceWaterfall(rootItem, traceParentChildrenMap, colorMap, colorBy)
      : [];

    return {
      rootItem,
      traceWaterfall,
      duration: getTraceWaterfallDuration(traceWaterfall),
      maxDepth: Math.max(...traceWaterfall.map((item) => item.depth)),
      legends,
      colorBy,
    };
  }, [traceItems]);

  return waterfall;
}

export function getLegends(traceItems: TraceItem[]): IWaterfallLegend[] {
  const serviceNames = Array.from(new Set(traceItems.map((item) => item.serviceName)));
  const spanTypes = Array.from(new Set(traceItems.map((item) => item.spanType ?? '')));

  const palette = euiPaletteColorBlind({
    rotations: Math.ceil((serviceNames.length + spanTypes.length) / 10),
  });

  let colorIndex = 0;
  const legends: IWaterfallLegend[] = [];

  serviceNames.forEach((serviceName) => {
    legends.push({
      type: WaterfallLegendType.ServiceName,
      value: serviceName,
      color: palette[colorIndex++],
    });
  });

  spanTypes.forEach((spanType) => {
    legends.push({
      type: WaterfallLegendType.SpanType,
      value: spanType || '',
      color: palette[colorIndex++],
    });
  });

  return legends;
}

export function createColorLookupMap(legends: IWaterfallLegend[]): Map<string, string> {
  return new Map(legends.map((legend) => [`${legend.type}:${legend.value}`, legend.color]));
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
  colorMap: Map<string, string>,
  colorBy: WaterfallLegendType
): TraceWaterfallItem[] {
  const rootStartMicroseconds = rootItem.timestampUs;

  function getTraceWaterfallItem(item: TraceItem, depth: number, parent?: TraceWaterfallItem) {
    const startMicroseconds = item.timestampUs;
    const color =
      colorBy === WaterfallLegendType.ServiceName
        ? colorMap.get(`${WaterfallLegendType.ServiceName}:${item.serviceName}`)!
        : colorMap.get(`${WaterfallLegendType.SpanType}:${item.spanType ?? ''}`)!;
    const traceWaterfallItem: TraceWaterfallItem = {
      ...item,
      depth,
      offset: startMicroseconds - rootStartMicroseconds,
      skew: getClockSkew({ itemTimestamp: startMicroseconds, itemDuration: item.duration, parent }),
      color,
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
