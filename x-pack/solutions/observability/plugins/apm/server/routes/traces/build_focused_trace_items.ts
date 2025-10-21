/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import type { TraceItem } from '../../../common/waterfall/unified_trace_item';

const MAX_NUMBER_OF_CHILDREN = 2;

interface Child {
  traceDoc: TraceItem;
  children?: Child[];
}

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
    const children: Child[] = [];
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

export interface FocusedTraceItems {
  rootDoc: TraceItem;
  parentDoc?: TraceItem;
  focusedTraceDoc: TraceItem;
  focusedTraceTree: Child[];
}

export function findRootItem(traceItems: TraceItem[]) {
  return traceItems.find((item) => !item.parentId);
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

  const rootDoc = itemsGroupedByParentId.root?.[0];
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

export function flattenChildren(children: FocusedTraceItems['focusedTraceTree']) {
  function convert(
    child: FocusedTraceItems['focusedTraceTree'][0]
  ): Array<FocusedTraceItems['rootDoc']> {
    const convertedChildren = child.children?.length ? child.children.flatMap(convert) : [];
    return [child.traceDoc, ...convertedChildren];
  }

  return children.flatMap(convert);
}

export function reparentDocumentToRoot(items: FocusedTraceItems) {
  if (!items) {
    return undefined;
  }
  const clonedItems = structuredClone(items);
  const rootDocId = clonedItems.rootDoc.id;

  if (rootDocId === clonedItems.focusedTraceDoc.id || rootDocId === clonedItems.parentDoc?.id) {
    return clonedItems;
  }

  if (clonedItems.parentDoc) {
    clonedItems.parentDoc.parentId = rootDocId;
  } else {
    clonedItems.focusedTraceDoc.parentId = rootDocId;
  }
  return clonedItems;
}

export function getFocusedTraceItems(items: FocusedTraceItems) {
  const children = items.focusedTraceTree || [];
  const childrenItems = flattenChildren(children);

  const traceItems = [
    items.rootDoc,
    items.parentDoc?.id === items.rootDoc.id ? undefined : items.parentDoc,
    items.focusedTraceDoc.id === items.rootDoc.id ? undefined : items.focusedTraceDoc,
    ...childrenItems,
  ].filter(Boolean) as TraceItem[];

  return traceItems;
}
