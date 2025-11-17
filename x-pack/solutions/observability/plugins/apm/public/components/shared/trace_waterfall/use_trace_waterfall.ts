/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiPaletteColorBlind } from '@elastic/eui';
import { useMemo } from 'react';
import { type IWaterfallLegend, WaterfallLegendType } from '../../../../common/waterfall/legend';
import type { TraceItem } from '../../../../common/waterfall/unified_trace_item';

export interface TraceWaterfallItem extends TraceItem {
  depth: number;
  offset: number;
  skew: number;
  color: string;
  isOrphan?: boolean;
}

export function useTraceWaterfall({
  traceItems,
  isFiltered = false,
}: {
  traceItems: TraceItem[];
  isFiltered?: boolean;
}) {
  const waterfall = useMemo(() => {
    const legends = getLegends(traceItems);
    const colorBy = getColorByType(legends);
    const colorMap = createColorLookupMap(legends);
    const traceParentChildrenMap = getTraceParentChildrenMap(traceItems, isFiltered);
    const { rootItem, traceState, orphans } = getRootItemOrFallback(
      traceParentChildrenMap,
      traceItems
    );
    const traceWaterfall = rootItem
      ? getTraceWaterfall({
          rootItem,
          parentChildMap: traceParentChildrenMap,
          orphans,
          colorMap,
          colorBy,
        })
      : [];

    return {
      rootItem,
      traceState,
      traceWaterfall,
      duration: getTraceWaterfallDuration(traceWaterfall),
      maxDepth: Math.max(...traceWaterfall.map((item) => item.depth)),
      legends,
      colorBy,
    };
  }, [traceItems, isFiltered]);

  return waterfall;
}

export function getColorByType(legends: IWaterfallLegend[]) {
  let count = 0;
  for (const { type } of legends) {
    if (type === WaterfallLegendType.ServiceName) count++;
    if (count > 1) return WaterfallLegendType.ServiceName;
  }
  return WaterfallLegendType.Type;
}

export function getLegends(traceItems: TraceItem[]): IWaterfallLegend[] {
  const serviceNames = Array.from(new Set(traceItems.map((item) => item.serviceName)));
  const types = Array.from(new Set(traceItems.map((item) => item.type ?? '')));

  const palette = euiPaletteColorBlind({
    rotations: Math.ceil((serviceNames.length + types.length) / 10),
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

  types.forEach((type) => {
    legends.push({
      type: WaterfallLegendType.Type,
      value: type,
      color: palette[colorIndex++],
    });
  });
  return legends;
}

export function createColorLookupMap(legends: IWaterfallLegend[]): Map<string, string> {
  return new Map(legends.map((legend) => [`${legend.type}:${legend.value}`, legend.color]));
}

export function getTraceParentChildrenMap(traceItems: TraceItem[], filteredTrace: boolean) {
  if (traceItems.length === 0) {
    return {};
  }

  const traceMap = traceItems.reduce<Record<string, TraceItem[]>>((acc, item) => {
    if (item.parentId) {
      (acc[item.parentId] ??= []).push(item);
    } else {
      (acc.root ??= [])[0] = item;
    }
    return acc;
  }, {});

  // TODO: Electing a fallback root item could be delegated to the server. For now
  // As mapping parent->children spans is done clientside, the root election is done
  // clientside as well.
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

export enum TraceDataState {
  Full = 'full',
  Partial = 'partial',
  Empty = 'empty',
}

export function getRootItemOrFallback(
  traceParentChildrenMap: Record<string, TraceItem[]>,
  traceItems: TraceItem[]
) {
  if (traceItems.length === 0) {
    return {
      traceState: TraceDataState.Empty,
    };
  }

  const rootItem = traceParentChildrenMap.root?.[0];

  const parentIds = new Set(traceItems.map(({ id }) => id));
  // TODO: Reuse waterfall util methods where possible or if logic is the same
  const orphans = traceItems.filter(
    (item) =>
      // Root cannot be an orphan.
      item.id !== rootItem?.id && item.parentId && !parentIds.has(item.parentId)
  );

  if (rootItem) {
    return {
      traceState: orphans.length === 0 ? TraceDataState.Full : TraceDataState.Partial,
      rootItem,
      orphans,
    };
  }

  const [fallbackRootItem, ...remainingOrphans] = orphans;

  return {
    traceState: TraceDataState.Partial,
    rootItem: fallbackRootItem,
    orphans: remainingOrphans,
  };
}

// TODO: Reuse waterfall util methods where possible or if logic is the same
function reparentOrphansToRoot(
  rootItem: TraceItem,
  parentChildMap: Record<string, TraceItem[]>,
  orphans: TraceItem[]
) {
  // Some cases with orphans, the root item has no direct link or children, so this
  // might be not initialised. This assigns the array in case of undefined/null to the
  // map.
  const children = (parentChildMap[rootItem.id] ??= []);

  children.push(...orphans.map((orphan) => ({ ...orphan, parentId: rootItem.id, isOrphan: true })));
}

export function getTraceWaterfall({
  rootItem,
  parentChildMap,
  orphans,
  colorMap,
  colorBy,
}: {
  rootItem: TraceItem;
  parentChildMap: Record<string, TraceItem[]>;
  orphans: TraceItem[];
  colorMap: Map<string, string>;
  colorBy: WaterfallLegendType;
}): TraceWaterfallItem[] {
  const rootStartMicroseconds = rootItem.timestampUs;

  reparentOrphansToRoot(rootItem, parentChildMap, orphans);

  function getTraceWaterfallItem(
    item: TraceItem,
    depth: number,
    parent?: TraceWaterfallItem
  ): TraceWaterfallItem[] {
    const startMicroseconds = item.timestampUs;
    const color =
      colorBy === WaterfallLegendType.ServiceName && item.serviceName
        ? colorMap.get(`${WaterfallLegendType.ServiceName}:${item.serviceName}`)!
        : colorMap.get(`${WaterfallLegendType.Type}:${item.type ?? ''}`)!;
    const traceWaterfallItem: TraceWaterfallItem = {
      ...item,
      depth,
      offset: startMicroseconds - rootStartMicroseconds,
      skew: getClockSkew({ itemTimestamp: startMicroseconds, itemDuration: item.duration, parent }),
      color,
    };

    const sortedChildren =
      parentChildMap[item.id]?.sort((a, b) => a.timestampUs - b.timestampUs) || [];

    const flattenedChildren = sortedChildren.flatMap((child) =>
      getTraceWaterfallItem(child, depth + 1, traceWaterfallItem)
    );

    return [traceWaterfallItem, ...flattenedChildren];
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
