/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiPaletteColorBlind } from '@elastic/eui';
import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { TraceItem } from '../../../../common/waterfall/unified_trace_item';
import type { IWaterfallLegend } from '../../app/transaction_details/waterfall_with_summary/waterfall_container/waterfall/waterfall_helpers/waterfall_helpers';
import { WaterfallLegendType } from '../../app/transaction_details/waterfall_with_summary/waterfall_container/waterfall/waterfall_helpers/waterfall_helpers';

const FALLBACK_WARNING = i18n.translate(
  'xpack.apm.traceWaterfallItem.warningMessage.fallbackWarning',
  {
    defaultMessage:
      'The trace document is incomplete and not all spans have arrived yet. Try refreshing the page or adjusting the time range.',
  }
);

const INSTRUMENTATION_WARNING = i18n.translate(
  'xpack.apm.traceWaterfallItem.euiCallOut.aDuplicatedSpanWasLabel',
  {
    defaultMessage:
      'A duplicated span was detected. This indicates a problem with how your services have been instrumented, as span IDs are meant to be unique.',
  }
);

export interface TraceWaterfallItem extends TraceItem {
  depth: number;
  offset: number;
  skew: number;
  color: string;
  isOrphan?: boolean;
}

export function useTraceWaterfall({ traceItems }: { traceItems: TraceItem[] }) {
  const waterfall = useMemo(() => {
    try {
      const serviceColorsMap = getServiceColors(traceItems);
      const traceParentChildrenMap = getTraceParentChildrenMap(traceItems);
      const { rootItem, traceState, orphans } = getRootItemOrFallback(
        traceParentChildrenMap,
        traceItems
      );

      const traceWaterfall = rootItem
        ? getTraceWaterfall({
            rootItem,
            parentChildMap: traceParentChildrenMap,
            orphans,
            serviceColorsMap,
          })
        : [];

      return {
        rootItem,
        traceState,
        message: traceState !== TraceDataState.Full ? FALLBACK_WARNING : undefined,
        traceWaterfall,
        duration: getTraceWaterfallDuration(traceWaterfall),
        maxDepth: Math.max(...traceWaterfall.map((item) => item.depth)),
      };
    } catch (e) {
      return {
        traceState: TraceDataState.Invalid,
        message: INSTRUMENTATION_WARNING,
        traceWaterfall: [],
        duration: 0,
        maxDepth: 0,
      };
    }
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

export enum TraceDataState {
  Full = 'full',
  Partial = 'partial',
  Empty = 'empty',
  Invalid = 'invalid',
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
  const orphans = traceItems.filter((item) => item.parentId && !parentIds.has(item.parentId));

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
  serviceColorsMap,
}: {
  rootItem: TraceItem;
  parentChildMap: Record<string, TraceItem[]>;
  orphans: TraceItem[];
  serviceColorsMap: Record<string, string>;
}): TraceWaterfallItem[] {
  const rootStartMicroseconds = rootItem.timestampUs;

  const visitor = new Set<string>([rootItem.id]);

  reparentOrphansToRoot(rootItem, parentChildMap, orphans);

  function getTraceWaterfallItem(
    item: TraceItem,
    depth: number,
    parent?: TraceWaterfallItem
  ): TraceWaterfallItem[] {
    const startMicroseconds = item.timestampUs;
    const traceWaterfallItem: TraceWaterfallItem = {
      ...item,
      depth,
      offset: startMicroseconds - rootStartMicroseconds,
      skew: getClockSkew({ itemTimestamp: startMicroseconds, itemDuration: item.duration, parent }),
      color: serviceColorsMap[item.serviceName],
    };

    const sortedChildren =
      parentChildMap[item.id]?.sort((a, b) => a.timestampUs - b.timestampUs) || [];

    const flattenedChildren = sortedChildren.flatMap((child) => {
      // Check if we have encountered the trace item before.
      // If we have visited the trace item before, then the child waterfall items are already
      // present in the flattened list, so we throw an error to alert the user of duplicated
      // spans. This should guard against circular or unusual links between spans.
      if (visitor.has(child.id)) {
        throw new Error('Duplicate span id detected');
      }

      // If we haven't visited it before, then we can process the waterfall item.
      visitor.add(child.id);
      return getTraceWaterfallItem(child, depth + 1, traceWaterfallItem);
    });

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
