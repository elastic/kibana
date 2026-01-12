/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EVENT_OUTCOME } from '@kbn/apm-types';
import { isRumAgentName } from '@kbn/elastic-agent-utils';
import type { TraceItem } from '../../../../../../common/waterfall/unified_trace_item';
import type {
  IWaterfall,
  IWaterfallItem,
  IWaterfallError,
} from './waterfall/waterfall_helpers/waterfall_helpers';
import type {
  WaterfallSpan,
  WaterfallTransaction,
} from '../../../../../../common/waterfall/typings';

type ErrorsByParentId = Map<string, Array<{ errorDocId: string }>>;

const DATABASE_ICON = 'database';
const GLOBE_ICON = 'globe';
const MERGE_ICON = 'merge';

/**
 * Converts IWaterfall data to TraceItem[] format expected by the unified TraceWaterfall component.
 *
 * @param waterfall - The waterfall data structure from APM
 * @returns TraceItem[] - Array of trace items for the TraceWaterfall component
 */
export function convertToTraceItems(waterfall: IWaterfall): TraceItem[] {
  const errorsByParentId = groupErrorsByParentId(waterfall.errorItems);

  return waterfall.items.map((item) => convertWaterfallItemToTraceItem(item, errorsByParentId));
}

/**
 * Groups waterfall errors by their parent ID for efficient lookup.
 *
 * @param errorItems - Array of waterfall error items to group
 * @returns Map where keys are parent IDs and values are arrays of error document IDs
 */
function groupErrorsByParentId(errorItems: IWaterfallError[]): ErrorsByParentId {
  const errorMap: ErrorsByParentId = new Map();

  for (const error of errorItems) {
    const { parentId, id } = error;
    if (!parentId) continue;

    const errors = errorMap.get(parentId);
    if (errors) {
      errors.push({ errorDocId: id });
      continue;
    }
    errorMap.set(parentId, [{ errorDocId: id }]);
  }

  return errorMap;
}

/**
 * Converts a single waterfall item (span or transaction) to a TraceItem.
 *
 * @param item - The waterfall item to convert (can be a span or transaction)
 * @param errorsByParentId - Map of errors grouped by parent ID for error association
 * @returns TraceItem with all necessary properties for rendering in the waterfall
 */
function convertWaterfallItemToTraceItem(
  item: IWaterfallItem,
  errorsByParentId: ErrorsByParentId
): TraceItem {
  const { doc, id, parentId, duration, spanLinksCount } = item;
  const errors = errorsByParentId.get(id) || [];

  const baseItem = {
    id,
    timestampUs: doc.timestamp.us,
    traceId: doc.trace.id,
    duration,
    errors,
    status: getStatus(doc),
    parentId,
    serviceName: doc.service.name,
    agentName: doc.agent.name,
    spanLinksCount: {
      incoming: spanLinksCount.linkedParents,
      outgoing: spanLinksCount.linkedChildren,
    },
  };

  if (item.docType === 'span') {
    const span = item.doc;
    return {
      ...baseItem,
      name: span.span.name,
      type: span.span.subtype || span.span.type,
      sync: span.span.sync,
      icon: getSpanIcon(span),
    };
  }

  const transaction = item.doc;
  return {
    ...baseItem,
    name: transaction.transaction.name,
    type: transaction.transaction.type,
    sync: undefined,
    icon: isRumAgentName(transaction.agent.name) ? GLOBE_ICON : MERGE_ICON,
  };
}

/**
 * Extracts the event outcome status from a span or transaction document.
 *
 * @param doc - The span or transaction document
 * @returns Status object with field name and value, or undefined if no outcome exists
 */
function getStatus(doc: WaterfallSpan | WaterfallTransaction): TraceItem['status'] | undefined {
  if (doc.event?.outcome) {
    return {
      fieldName: EVENT_OUTCOME,
      value: doc.event.outcome,
    };
  }
  return undefined;
}

/**
 * Returns the appropriate icon for a span based on its type.
 *
 * @param span - The span document to determine the icon for
 * @returns Icon name string or undefined if no specific icon applies
 */
function getSpanIcon(span: WaterfallSpan): string | undefined {
  const { type } = span.span;
  if (type?.startsWith('db')) {
    return DATABASE_ICON;
  }
  return undefined;
}
