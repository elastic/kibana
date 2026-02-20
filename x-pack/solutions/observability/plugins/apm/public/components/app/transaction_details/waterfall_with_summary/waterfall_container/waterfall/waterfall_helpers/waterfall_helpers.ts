/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiPaletteColorBlind } from '@elastic/eui';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import type { Dictionary } from 'lodash';
import { first, flatten, groupBy, isEmpty, sortBy, uniq } from 'lodash';
import type { Error } from '@kbn/apm-types';
import type { IWaterfallLegend } from '../../../../../../../../common/waterfall/legend';
import { WaterfallLegendType } from '../../../../../../../../common/waterfall/legend';
import { isOpenTelemetryAgentName } from '../../../../../../../../common/agent_name';
import type { CriticalPathSegment } from '../../../../../../shared/trace_waterfall/critical_path';
import type {
  WaterfallSpan,
  WaterfallTransaction,
} from '../../../../../../../../common/waterfall/typings';
import type { Transaction } from '../../../../../../../../typings/es_schemas/ui/transaction';
import type { APIReturnType } from '../../../../../../../services/rest/create_call_apm_api';

type TraceAPIResponse = APIReturnType<'GET /internal/apm/traces/{traceId}'>;

const ROOT_ID = 'root';

export interface SpanLinksCount {
  linkedChildren: number;
  linkedParents: number;
}

export interface IWaterfall {
  entryTransaction?: Transaction;
  entryWaterfallTransaction?: IWaterfallTransaction;
  rootWaterfallTransaction?: IWaterfallTransaction;

  /**
   * Latency in us
   */
  duration: number;
  items: IWaterfallItem[];
  childrenByParentId: Record<string | number, IWaterfallSpanOrTransaction[]>;
  getErrorCount: (parentId: string) => number;
  legends: IWaterfallLegend[];
  colorBy: WaterfallLegendType;
  errorItems: IWaterfallError[];
  exceedsMax: boolean;
  totalErrorsCount: number;
  traceDocsTotal: number;
  maxTraceItems: number;
  orphanTraceItemsCount: number;
}

interface IWaterfallItemBase<TDocument, TDoctype> {
  doc: TDocument;
  docType: TDoctype;
  id: string;
  parent?: IWaterfallSpanOrTransaction;
  parentId?: string;
  color: string;
  /**
   * offset from first item in us
   */
  offset: number;
  /**
   * skew from timestamp in us
   */
  skew: number;
  /**
   * Latency in us
   */
  duration: number;
  legendValues: Record<WaterfallLegendType, string>;
  spanLinksCount: SpanLinksCount;
  isOrphan?: boolean;
  missingDestination?: boolean;
}

export type IWaterfallError = Omit<
  IWaterfallItemBase<Error, 'error'>,
  'duration' | 'legendValues' | 'spanLinksCount'
>;

export type IWaterfallTransaction = IWaterfallItemBase<WaterfallTransaction, 'transaction'>;

export type IWaterfallSpan = IWaterfallItemBase<WaterfallSpan, 'span'>;

export type IWaterfallSpanOrTransaction = IWaterfallTransaction | IWaterfallSpan;

export type IWaterfallItem = IWaterfallSpanOrTransaction;

export interface IWaterfallNode {
  id: string;
  item: IWaterfallItem;
  // children that are loaded
  children: IWaterfallNode[];
  // total number of children that needs to be loaded
  childrenToLoad: number;
  // collapsed or expanded state
  expanded: boolean;
  // level in the tree
  level: number;
  // flag to indicate if children are loaded
  hasInitializedChildren: boolean;
}

export type IWaterfallNodeFlatten = Omit<IWaterfallNode, 'children'>;

function getLegendValues(transactionOrSpan: WaterfallTransaction | WaterfallSpan) {
  return {
    [WaterfallLegendType.ServiceName]: transactionOrSpan.service.name,
    [WaterfallLegendType.Type]:
      transactionOrSpan.processor.event === ProcessorEvent.span
        ? (transactionOrSpan as WaterfallSpan).span.subtype ||
          (transactionOrSpan as WaterfallSpan).span.type
        : '',
  };
}

export function getTransactionItem(
  transaction: WaterfallTransaction,
  linkedChildrenCount: number = 0
): IWaterfallTransaction {
  return {
    docType: 'transaction',
    doc: transaction,
    id: transaction.transaction.id,
    parentId: transaction.parent?.id,
    duration: transaction.transaction.duration.us,
    offset: 0,
    skew: 0,
    legendValues: getLegendValues(transaction),
    color: '',
    spanLinksCount: {
      linkedParents: transaction.span?.links?.length ?? 0,
      linkedChildren: linkedChildrenCount,
    },
  };
}

export function getSpanItem(span: WaterfallSpan, linkedChildrenCount: number = 0): IWaterfallSpan {
  return {
    docType: 'span',
    doc: span,
    id: span.span.id,
    parentId: span.parent?.id,
    duration: span.span.duration.us,
    offset: 0,
    skew: 0,
    legendValues: getLegendValues(span),
    color: '',
    spanLinksCount: {
      linkedParents: span.span.links?.length ?? 0,
      linkedChildren: linkedChildrenCount,
    },
  };
}

function getErrorItem(
  error: Error,
  items: IWaterfallItem[],
  entryWaterfallTransaction?: IWaterfallTransaction
): IWaterfallError {
  const entryTimestamp = entryWaterfallTransaction?.doc.timestamp.us ?? 0;
  const parent = items.find((waterfallItem) => waterfallItem.id === error.parent?.id) as
    | IWaterfallSpanOrTransaction
    | undefined;

  const errorItem: IWaterfallError = {
    docType: 'error',
    doc: error,
    id: error.error.id ?? error.id,
    parent,
    parentId: parent?.id,
    offset: error.timestamp.us - entryTimestamp,
    skew: 0,
    color: '',
  };

  return {
    ...errorItem,
    skew: getClockSkew(errorItem, parent),
  };
}

export function getClockSkew(
  item: IWaterfallItem | IWaterfallError,
  parentItem?: IWaterfallSpanOrTransaction
) {
  if (!parentItem) {
    return 0;
  }
  switch (item.docType) {
    // don't calculate skew for spans and errors. Just use parent's skew
    case 'error':
    case 'span':
      return parentItem.skew;
    // transaction is the initial entry in a service. Calculate skew for this, and it will be propagated to all child spans
    case 'transaction': {
      const parentStart = parentItem.doc.timestamp.us + parentItem.skew;

      // determine if child starts before the parent
      const offsetStart = parentStart - item.doc.timestamp.us;
      if (offsetStart > 0) {
        const latency = Math.max(parentItem.duration - item.duration, 0) / 2;
        return offsetStart + latency;
      }

      // child transaction starts after parent thus no adjustment is needed
      return 0;
    }
  }
}

export function getOrderedWaterfallItems(
  childrenByParentId: Record<string, IWaterfallSpanOrTransaction[]>,
  entryWaterfallTransaction?: IWaterfallTransaction
) {
  if (!entryWaterfallTransaction) {
    return [];
  }
  const entryTimestamp = entryWaterfallTransaction.doc.timestamp.us;
  const visitedWaterfallItemSet = new Set();

  function getSortedChildren(
    item: IWaterfallSpanOrTransaction,
    parentItem?: IWaterfallSpanOrTransaction
  ): IWaterfallSpanOrTransaction[] {
    if (visitedWaterfallItemSet.has(item)) {
      return [];
    }
    visitedWaterfallItemSet.add(item);

    const children = sortBy(childrenByParentId[item.id] || [], 'doc.timestamp.us');

    item.parent = parentItem;
    // get offset from the beginning of trace
    item.offset = item.doc.timestamp.us - entryTimestamp;
    // move the item to the right if it starts before its parent
    item.skew = getClockSkew(item, parentItem);

    const deepChildren = flatten(children.map((child) => getSortedChildren(child, item)));
    return [item, ...deepChildren];
  }

  return getSortedChildren(entryWaterfallTransaction);
}

function getRootWaterfallTransaction(
  childrenByParentId: Record<string, IWaterfallSpanOrTransaction[]>
) {
  const item = first(childrenByParentId.root);
  if (item && item.docType === 'transaction') {
    return item;
  }
}

export function generateLegendsAndAssignColorsToWaterfall(waterfallItems: IWaterfallItem[]) {
  const onlyBaseSpanItems = waterfallItems.filter(
    (item) => item.docType === 'span' || item.docType === 'transaction'
  ) as IWaterfallSpanOrTransaction[];

  const legends = [WaterfallLegendType.ServiceName, WaterfallLegendType.Type].flatMap(
    (legendType) => {
      const allLegendValues = uniq(onlyBaseSpanItems.map((item) => item.legendValues[legendType]));

      const palette = euiPaletteColorBlind({
        rotations: Math.ceil(allLegendValues.length / 10),
      });

      return allLegendValues.map((value, index) => ({
        type: legendType,
        value,
        color: palette[index],
      }));
    }
  );

  const serviceLegends = legends.filter(({ type }) => type === WaterfallLegendType.ServiceName);
  // only color by span type if there are only events for one service
  const colorBy =
    serviceLegends.length > 1 ? WaterfallLegendType.ServiceName : WaterfallLegendType.Type;

  const serviceColorsMap = serviceLegends.reduce((colorMap, legend) => {
    colorMap[legend.value] = legend.color;
    return colorMap;
  }, {} as Record<string, string>);

  const legendsByValue = legends.reduce<Record<string, IWaterfallLegend>>((acc, curr) => {
    if (curr.type === colorBy) {
      acc[curr.value] = curr;
    }
    return acc;
  }, {});

  // mutate items rather than rebuilding both items and childrenByParentId
  waterfallItems.forEach((item) => {
    let color = '';
    if ('legendValues' in item) {
      color = legendsByValue[item.legendValues[colorBy]].color;
    }

    if (!color) {
      // fall back to service color if there's no span.type, e.g. for transactions
      color = serviceColorsMap[item.doc.service.name];
    }

    item.color = color;
  });

  return { legends, colorBy };
}

const getWaterfallDuration = (waterfallItems: IWaterfallItem[]) =>
  Math.max(
    ...waterfallItems.map(
      (item) => item.offset + item.skew + ('duration' in item ? item.duration : 0)
    ),
    0
  );

const getWaterfallItems = (
  items: Array<WaterfallTransaction | WaterfallSpan>,
  spanLinksCountById: TraceAPIResponse['traceItems']['spanLinksCountById']
) =>
  items.map((item) => {
    const docType = item.processor.event;
    switch (docType) {
      case 'span': {
        const span = item as WaterfallSpan;
        return getSpanItem(span, spanLinksCountById[span.span.id]);
      }
      case 'transaction':
        const transaction = item as WaterfallTransaction;
        return getTransactionItem(transaction, spanLinksCountById[transaction.transaction.id]);
    }
  });

function reparentSpans(waterfallItems: IWaterfallSpanOrTransaction[]) {
  // find children that needs to be re-parented and map them to their correct parent id
  const childIdToParentIdMapping = Object.fromEntries(
    flatten(
      waterfallItems.map((waterfallItem) => {
        if (waterfallItem.docType === 'span') {
          const childIds = waterfallItem.doc.child?.id ?? [];
          return childIds.map((id) => [id, waterfallItem.id]);
        }
        return [];
      })
    )
  );

  // update parent id for children that needs it or return unchanged
  return waterfallItems.map((waterfallItem) => {
    const newParentId = childIdToParentIdMapping[waterfallItem.id];
    if (newParentId) {
      return {
        ...waterfallItem,
        parentId: newParentId,
      };
    }

    return waterfallItem;
  });
}

const getChildrenGroupedByParentId = (waterfallItems: IWaterfallSpanOrTransaction[]) => {
  const childrenGroups = groupBy(waterfallItems, (item) => item.parentId ?? ROOT_ID);

  const childrenGroupedByParentId = Object.entries(childrenGroups).reduce(
    (acc, [parentId, items]) => {
      // we shouldn't include the parent item in the children list
      const filteredItems = items.filter((item) => item.id !== parentId);
      return {
        ...acc,
        [parentId]: filteredItems,
      };
    },
    {}
  );

  return childrenGroupedByParentId;
};

const getEntryWaterfallTransaction = (
  entryTransactionId: string,
  waterfallItems: IWaterfallItem[]
): IWaterfallTransaction | undefined =>
  waterfallItems.find(
    (item) => item.docType === 'transaction' && item.id === entryTransactionId
  ) as IWaterfallTransaction;

function isInEntryTransaction(
  parentIdLookup: Map<string, string>,
  entryTransactionId: string,
  currentId: string
): boolean {
  if (currentId === entryTransactionId) {
    return true;
  }
  const parentId = parentIdLookup.get(currentId);
  if (parentId) {
    return isInEntryTransaction(parentIdLookup, entryTransactionId, parentId);
  }
  return false;
}

function getWaterfallErrors(
  errorDocs: TraceAPIResponse['traceItems']['errorDocs'],
  items: IWaterfallItem[],
  entryWaterfallTransaction?: IWaterfallTransaction
) {
  const errorItems = errorDocs.map((errorDoc) =>
    getErrorItem(errorDoc, items, entryWaterfallTransaction)
  );
  if (!entryWaterfallTransaction) {
    return errorItems;
  }
  const parentIdLookup = [...items, ...errorItems].reduce((map, { id, parentId }) => {
    map.set(id, parentId ?? ROOT_ID);
    return map;
  }, new Map<string, string>());
  return errorItems.filter((errorItem) =>
    isInEntryTransaction(parentIdLookup, entryWaterfallTransaction?.id, errorItem.id)
  );
}

// map parent.id to the number of errors
/*
  { 'parentId': 2 }
  */
function getErrorCountByParentId(errorDocs: TraceAPIResponse['traceItems']['errorDocs']) {
  return errorDocs.reduce<Record<string, number>>((acc, doc) => {
    const parentId = doc.parent?.id;

    if (!parentId) {
      return acc;
    }

    acc[parentId] = (acc[parentId] ?? 0) + 1;

    return acc;
  }, {});
}

export function getOrphanItemsIds(
  waterfall: IWaterfallSpanOrTransaction[],
  entryWaterfallTransactionId?: string
) {
  const waterfallItemsIds = new Set(waterfall.map((item) => item.id));
  return waterfall
    .filter(
      (item) =>
        // the root transaction should never be orphan
        entryWaterfallTransactionId !== item.id &&
        item.parentId &&
        !waterfallItemsIds.has(item.parentId)
    )
    .map((item) => item.id);
}

export function reparentOrphanItems(
  orphanItemsIds: string[],
  waterfallItems: IWaterfallSpanOrTransaction[],
  entryWaterfallTransaction?: IWaterfallTransaction
) {
  const orphanIdsMap = new Set(orphanItemsIds);
  return waterfallItems.reduce<IWaterfallSpanOrTransaction[]>((acc, item) => {
    if (orphanIdsMap.has(item.id)) {
      // we need to filter out the orphan item if it's longer or if it has started before the entry transaction
      // as this means it's a parent of the entry transaction
      const isLongerThanEntryTransaction =
        entryWaterfallTransaction && item.duration > entryWaterfallTransaction?.duration;
      const hasStartedBeforeEntryTransaction =
        entryWaterfallTransaction &&
        item.doc.timestamp.us < entryWaterfallTransaction.doc.timestamp.us;

      if (isLongerThanEntryTransaction || hasStartedBeforeEntryTransaction) {
        return acc;
      }

      acc.push({
        ...item,
        parentId: entryWaterfallTransaction?.id,
        isOrphan: true,
      });
    } else {
      acc.push(item);
    }

    return acc;
  }, []);
}

export function getWaterfall(apiResponse: TraceAPIResponse): IWaterfall {
  const { traceItems, entryTransaction } = apiResponse;
  if (isEmpty(traceItems.traceDocs) || !entryTransaction) {
    return {
      duration: 0,
      items: [],
      legends: [],
      colorBy: WaterfallLegendType.ServiceName,
      errorItems: [],
      childrenByParentId: {},
      getErrorCount: () => 0,
      exceedsMax: false,
      totalErrorsCount: 0,
      traceDocsTotal: 0,
      maxTraceItems: 0,
      orphanTraceItemsCount: 0,
    };
  }

  const errorCountByParentId = getErrorCountByParentId(traceItems.errorDocs);

  const waterfallItems: IWaterfallSpanOrTransaction[] = getWaterfallItems(
    traceItems.traceDocs,
    traceItems.spanLinksCountById
  );

  let entryWaterfallTransaction: IWaterfallTransaction | undefined = getEntryWaterfallTransaction(
    entryTransaction.transaction.id,
    waterfallItems
  );

  const orphanItemsIds = getOrphanItemsIds(waterfallItems, entryWaterfallTransaction?.id);
  const childrenByParentId = getChildrenGroupedByParentId(
    reparentOrphanItems(orphanItemsIds, reparentSpans(waterfallItems), entryWaterfallTransaction)
  );

  const rootWaterfallTransaction = getRootWaterfallTransaction(childrenByParentId);

  if (!entryWaterfallTransaction && rootWaterfallTransaction) {
    entryWaterfallTransaction = rootWaterfallTransaction;
  }

  const items = getOrderedWaterfallItems(childrenByParentId, entryWaterfallTransaction);
  const errorItems = getWaterfallErrors(traceItems.errorDocs, items, entryWaterfallTransaction);

  const duration = getWaterfallDuration(items);
  const { legends, colorBy } = generateLegendsAndAssignColorsToWaterfall(items);

  return {
    entryWaterfallTransaction,
    rootWaterfallTransaction,
    entryTransaction,
    duration,
    items,
    legends,
    colorBy,
    errorItems,
    childrenByParentId: getChildrenGroupedByParentId(items),
    getErrorCount: (parentId: string) => errorCountByParentId[parentId] ?? 0,
    exceedsMax: traceItems.exceedsMax,
    totalErrorsCount: traceItems.errorDocs.length,
    traceDocsTotal: traceItems.traceDocsTotal,
    maxTraceItems: traceItems.maxTraceItems,
    orphanTraceItemsCount: orphanItemsIds.length,
  };
}

function getChildren({
  path,
  waterfall,
  waterfallItemId,
  rootId,
}: {
  waterfallItemId: string;
  waterfall: IWaterfall;
  path: {
    criticalPathSegmentsById: Dictionary<CriticalPathSegment<IWaterfallSpanOrTransaction>[]>;
    showCriticalPath: boolean;
  };
  rootId: string;
}) {
  const children = waterfall.childrenByParentId[waterfallItemId] ?? [];

  return path.showCriticalPath
    ? children.filter((child) => path.criticalPathSegmentsById[child.id]?.length)
    : children;
}

function buildTree({
  root,
  waterfall,
  maxLevelOpen,
  path,
}: {
  root: IWaterfallNode;
  waterfall: IWaterfall;
  maxLevelOpen: number;
  path: {
    criticalPathSegmentsById: Dictionary<CriticalPathSegment<IWaterfallSpanOrTransaction>[]>;
    showCriticalPath: boolean;
  };
}) {
  const tree = { ...root };
  const queue: IWaterfallNode[] = [tree];

  for (let queueIndex = 0; queueIndex < queue.length; queueIndex++) {
    const node = queue[queueIndex];

    const children = getChildren({
      path,
      waterfall,
      waterfallItemId: node.item.id,
      rootId: root.item.id,
    });

    // Set childrenToLoad for all nodes enqueued.
    // this allows lazy loading of child nodes
    node.childrenToLoad = children.length;

    if (maxLevelOpen > node.level) {
      children.forEach((child, index) => {
        const level = node.level + 1;

        const currentNode: IWaterfallNode = {
          id: `${level}-${child.id}-${index}`,
          item: child,
          children: [],
          level,
          expanded: level < maxLevelOpen,
          childrenToLoad: 0,
          hasInitializedChildren: false,
        };

        // It is missing a destination when a child (currentNode) is a transaction
        // and its parent (node) is a span without destination for Otel agents.

        if (
          currentNode.item.docType === 'transaction' &&
          node.item.docType === 'span' &&
          !node.item.doc.span?.destination?.service?.resource &&
          isOpenTelemetryAgentName(node.item.doc.agent.name)
        ) {
          node.item.missingDestination = true;
        }

        node.children.push(currentNode);
        queue.push(currentNode);
      });

      node.hasInitializedChildren = true;
    }
  }

  return tree;
}

export function buildTraceTree({
  waterfall,
  maxLevelOpen,
  isOpen,
  path,
}: {
  waterfall: IWaterfall;
  maxLevelOpen: number;
  isOpen: boolean;
  path: {
    criticalPathSegmentsById: Dictionary<CriticalPathSegment<IWaterfallSpanOrTransaction>[]>;
    showCriticalPath: boolean;
  };
}): IWaterfallNode | null {
  const entry = waterfall.entryWaterfallTransaction;
  if (!entry) {
    return null;
  }

  const root: IWaterfallNode = {
    id: entry.id,
    item: entry,
    children: [],
    level: 0,
    expanded: isOpen,
    childrenToLoad: 0,
    hasInitializedChildren: false,
  };

  return buildTree({ root, maxLevelOpen, waterfall, path });
}

export const convertTreeToList = (root: IWaterfallNode | null): IWaterfallNodeFlatten[] => {
  if (!root) {
    return [];
  }

  const result: IWaterfallNodeFlatten[] = [];
  const stack: IWaterfallNode[] = [root];

  while (stack.length > 0) {
    const node = stack.pop()!;

    const { children, ...nodeWithoutChildren } = node;
    result.push(nodeWithoutChildren);

    if (node.expanded) {
      for (let i = node.children.length - 1; i >= 0; i--) {
        stack.push(node.children[i]);
      }
    }
  }

  return result;
};

export const updateTraceTreeNode = ({
  root,
  updatedNode,
  waterfall,
  path,
}: {
  root: IWaterfallNode;
  updatedNode: IWaterfallNodeFlatten;
  waterfall: IWaterfall;
  path: {
    criticalPathSegmentsById: Dictionary<CriticalPathSegment<IWaterfallSpanOrTransaction>[]>;
    showCriticalPath: boolean;
  };
}) => {
  if (!root) {
    return;
  }

  const tree = { ...root };
  const stack: Array<{ parent: IWaterfallNode | null; index: number; node: IWaterfallNode }> = [
    { parent: null, index: 0, node: root },
  ];

  while (stack.length > 0) {
    const { parent, index, node } = stack.pop()!;

    if (node.id === updatedNode.id) {
      Object.assign(node, updatedNode);

      if (updatedNode.expanded && !updatedNode.hasInitializedChildren) {
        Object.assign(
          node,
          buildTree({
            root: node,
            waterfall,
            maxLevelOpen: node.level + 1, // Only one level above the current node will be loaded
            path,
          })
        );
      }

      if (parent) {
        parent.children[index] = node;
      } else {
        Object.assign(tree, node);
      }

      return tree;
    }

    for (let i = node.children.length - 1; i >= 0; i--) {
      stack.push({ parent: node, index: i, node: node.children[i] });
    }
  }

  return tree;
};
