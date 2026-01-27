/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiPaletteColorBlind } from '@elastic/eui';
import type { Error } from '@kbn/apm-types';
import { i18n } from '@kbn/i18n';
import { useMemo } from 'react';
import { WaterfallLegendType, type IWaterfallLegend } from '../../../../common/waterfall/legend';
import type { TraceItem } from '../../../../common/waterfall/unified_trace_item';
import type { ErrorMark } from '../../app/transaction_details/waterfall_with_summary/waterfall_container/marks/get_error_marks';
import type { OnErrorClick } from './trace_waterfall_context';

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

export function useTraceWaterfall({
  traceItems,
  isFiltered = false,
  errors,
  onErrorClick,
}: {
  traceItems: TraceItem[];
  isFiltered?: boolean;
  errors?: Error[];
  onErrorClick?: OnErrorClick;
}) {
  const waterfall = useMemo(() => {
    try {
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

      const errorMarks =
        rootItem && errors
          ? getWaterfallErrorsMarks({
              errors,
              traceItems: traceWaterfall,
              rootItem,
              onErrorClick,
            })
          : [];

      return {
        rootItem,
        traceState,
        message: traceState !== TraceDataState.Full ? FALLBACK_WARNING : undefined,
        traceWaterfall,
        duration: getTraceWaterfallDuration(traceWaterfall),
        maxDepth: Math.max(...traceWaterfall.map((item) => item.depth)),
        legends,
        colorBy,
        errorMarks,
      };
    } catch (e) {
      return {
        traceState: TraceDataState.Invalid,
        message: INSTRUMENTATION_WARNING,
        traceWaterfall: [],
        legends: [],
        duration: 0,
        maxDepth: 0,
        colorBy: WaterfallLegendType.Type,
        errorMarks: [],
      };
    }
  }, [traceItems, isFiltered, errors, onErrorClick]);

  return waterfall;
}

function getWaterfallErrorsMarks({
  errors,
  traceItems,
  rootItem,
  onErrorClick,
}: {
  errors: Error[];
  traceItems: TraceWaterfallItem[];
  rootItem: TraceItem;
  onErrorClick?: OnErrorClick;
}): ErrorMark[] {
  const rootTimestampUs = rootItem.timestampUs;
  const traceItemsByIdMap = new Map(traceItems.map((item) => [item.id, item]));
  return errors.map((error) => {
    const parent = error.parent?.id ? traceItemsByIdMap.get(error.parent?.id) : undefined;
    const docId = error.transaction?.id || error.span?.id;
    return {
      type: 'errorMark',
      error,
      id: error.id,
      verticalLine: false,
      offset: error.timestamp.us - rootTimestampUs,
      skew: getClockSkew({ itemTimestamp: error.timestamp.us, itemDuration: 0, parent }),
      serviceColor: parent?.color ?? '',
      onClick:
        onErrorClick && docId
          ? () => {
              onErrorClick({
                traceId: rootItem.traceId,
                docId,
                errorCount: 1,
                errorDocId: error.id,
                docIndex: error.index,
              });
            }
          : undefined,
    };
  });
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

  const visitor = new Set<string>([rootItem.id]);

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
