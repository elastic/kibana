/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import type { TraceItem, TraceItemChild, FocusedTraceItems } from '@kbn/apm-types';

const MAX_NUMBER_OF_CHILDREN = 2;

export function buildChildrenTree({
  initialTraceDoc,
  itemsGroupedByParentId,
  maxNumberOfChildren,
}: {
  initialTraceDoc: TraceItem;
  itemsGroupedByParentId: Record<string, TraceItem[]>;
  maxNumberOfChildren: number;
}) {
  let _processedItemsCount = 0;
  function findChildren(traceDoc: TraceItem) {
    const id = traceDoc.id;
    if (!id) {
      return [];
    }
    const children: TraceItemChild[] = [];
    const _children = itemsGroupedByParentId[id];
    if (isEmpty(_children)) {
      return [];
    }
    for (let i = 0; i < _children.length; i++) {
      const child = _children[i];
      _processedItemsCount++;
      if (_processedItemsCount > maxNumberOfChildren) {
        break;
      }
      children.push({ traceDoc: child, children: findChildren(child) });
    }
    return children;
  }
  return findChildren(initialTraceDoc);
}

/**
 * Returns the trace root item, falling back to the first orphan item (whose parent is not part
 * of the trace items) when the actual root is missing, mirroring the full trace waterfall.
 */
export function findRootItem(traceItems: TraceItem[]) {
  const rootItem = traceItems.find((item) => !item.parentId);
  if (rootItem) {
    return rootItem;
  }

  const ids = new Set(traceItems.map(({ id }) => id));
  return traceItems.find((item) => item.parentId && !ids.has(item.parentId));
}

export function buildFocusedTraceItems({
  traceItems,
  docId,
}: {
  traceItems: TraceItem[];
  docId: string;
}): FocusedTraceItems | undefined {
  const itemsById = traceItems.reduce<Record<string, TraceItem>>((acc, curr) => {
    const id = curr.id;
    if (!id) {
      return acc;
    }
    acc[id] = curr;
    return acc;
  }, {});

  const focusedTraceDoc = itemsById[docId];
  if (!focusedTraceDoc) {
    return undefined;
  }
  const parentDoc = focusedTraceDoc.parentId ? itemsById[focusedTraceDoc.parentId] : undefined;

  const itemsGroupedByParentId = traceItems.reduce<Record<string, TraceItem[]>>((acc, curr) => {
    const parentId = curr.parentId;
    if (!parentId) {
      acc.root = [curr];
      return acc;
    }

    const group = acc[parentId] || [];
    group.push(curr);
    acc[parentId] = group;
    return acc;
  }, {});

  const rootDoc = itemsGroupedByParentId.root?.[0] ?? findRootItem(traceItems);
  if (!rootDoc) {
    return undefined;
  }

  const focusedTraceTree = buildChildrenTree({
    initialTraceDoc: focusedTraceDoc,
    itemsGroupedByParentId,
    maxNumberOfChildren: MAX_NUMBER_OF_CHILDREN,
  });

  return {
    rootDoc,
    parentDoc,
    focusedTraceDoc,
    focusedTraceTree,
  };
}
