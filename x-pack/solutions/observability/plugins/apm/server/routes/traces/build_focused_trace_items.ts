/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import type { TraceDoc, TraceItems } from './get_trace_items';

interface Child {
  traceDoc: TraceDoc;
  children?: Child[];
}

const MAX_NUMBER_OF_CHILDREN = 2;

export function buildChildrenTree({
  initialTraceDoc,
  itemsGroupedByParentId,
  maxNumberOfChildren,
}: {
  initialTraceDoc: TraceDoc;
  itemsGroupedByParentId: Record<string, TraceDoc[]>;
  maxNumberOfChildren: number;
}) {
  let _processedItemsCount = 0;
  function findChildren(traceDoc: TraceDoc) {
    const id = getId(traceDoc);
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
  rootTransaction: TraceDoc;
  parentDoc?: TraceDoc;
  focusedTraceDoc: TraceDoc;
  focusedTraceTree: Child[];
}

export function buildFocusedTraceItems({
  traceItems,
  docId,
}: {
  traceItems: TraceItems;
  docId: string;
}): FocusedTraceItems | undefined {
  const { traceDocs } = traceItems;

  const itemsById = traceDocs.reduce<Record<string, TraceDoc>>((acc, curr) => {
    const id = getId(curr);
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
  const parentDoc = focusedTraceDoc.parent?.id ? itemsById[focusedTraceDoc.parent?.id] : undefined;

  const itemsGroupedByParentId = traceDocs.reduce<Record<string, TraceDoc[]>>((acc, curr) => {
    const parentId = curr.parent?.id;
    const isRootTransaction = !parentId;
    if (isRootTransaction) {
      acc.root = [curr];
      return acc;
    }

    const group = acc[parentId] || [];
    group.push(curr);
    acc[parentId] = group;
    return acc;
  }, {});

  const rootTransaction = itemsGroupedByParentId.root?.[0];

  const focusedTraceTree = buildChildrenTree({
    initialTraceDoc: focusedTraceDoc,
    itemsGroupedByParentId,
    maxNumberOfChildren: MAX_NUMBER_OF_CHILDREN,
  });

  return {
    rootTransaction,
    parentDoc,
    focusedTraceDoc,
    focusedTraceTree,
  };
}

const getId = (traceDoc: TraceDoc) => traceDoc.span?.id ?? traceDoc.transaction?.id;
