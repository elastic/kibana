/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiPaletteColorBlind } from '@elastic/eui';
import { first, flatten, groupBy, isEmpty, keyBy, sortBy, uniq } from 'lodash';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import type { Span } from '../../typings/es_schemas/ui/span';
import type { Transaction } from '../../typings/es_schemas/ui/transaction';
import {
  IWaterfall,
  IWaterfallError,
  IWaterfallItem,
  IWaterfallSpan,
  IWaterfallSpanOrTransaction,
  IWaterfallTransaction,
  RootTransaction,
  WaterfallErrorDoc,
  WaterfallLegendType,
} from './typings';
import type { TraceItems } from './typings';

interface IWaterfallGroup {
  [key: string]: IWaterfallSpanOrTransaction[];
}

const ROOT_ID = 'root';

function getLegendValues(transactionOrSpan: Transaction | Span) {
  return {
    [WaterfallLegendType.ServiceName]: transactionOrSpan.service.name,
    [WaterfallLegendType.SpanType]:
      transactionOrSpan.processor.event === ProcessorEvent.span
        ? (transactionOrSpan as Span).span.subtype ||
          (transactionOrSpan as Span).span.type
        : '',
  };
}

function getTransactionItem(
  transaction: Transaction,
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

function getSpanItem(
  span: Span,
  linkedChildrenCount: number = 0
): IWaterfallSpan {
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
  waterfallErrorDoc: WaterfallErrorDoc,
  items: IWaterfallItem[],
  entryWaterfallTransaction?: IWaterfallTransaction
): IWaterfallError {
  const entryTimestamp = entryWaterfallTransaction?.doc.timestamp.us ?? 0;
  const parent = items.find(
    (waterfallItem) => waterfallItem.id === waterfallErrorDoc.parent?.id
  ) as IWaterfallSpanOrTransaction | undefined;

  const errorItem: IWaterfallError = {
    docType: 'error',
    doc: waterfallErrorDoc,
    id: waterfallErrorDoc.error.id,
    parent,
    parentId: parent?.id,
    offset: waterfallErrorDoc.timestamp.us - entryTimestamp,
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
    // transaction is the inital entry in a service. Calculate skew for this, and it will be propogated to all child spans
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
  childrenByParentId: IWaterfallGroup,
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

    const children = sortBy(
      childrenByParentId[item.id] || [],
      'doc.timestamp.us'
    );

    item.parent = parentItem;
    // get offset from the beginning of trace
    item.offset = item.doc.timestamp.us - entryTimestamp;
    // move the item to the right if it starts before its parent
    item.skew = getClockSkew(item, parentItem);

    const deepChildren = flatten(
      children.map((child) => getSortedChildren(child, item))
    );
    return [item, ...deepChildren];
  }

  return getSortedChildren(entryWaterfallTransaction);
}

function getRootTransaction(
  childrenByParentId: IWaterfallGroup
): RootTransaction | undefined {
  const item = first(childrenByParentId.root);
  if (item && item.docType === 'transaction') {
    return {
      transaction: {
        duration: item.doc.transaction.duration,
        id: item.doc.transaction.id,
        name: item.doc.transaction.name,
        type: item.doc.transaction.type,
      },
      trace: {
        id: item.doc.trace.id,
      },
      service: {
        name: item.doc.service.name,
        environment: item.doc.service.environment,
      },
    };
  }
}

function getLegends(waterfallItems: IWaterfallItem[]) {
  const onlyBaseSpanItems = waterfallItems.filter(
    (item) => item.docType === 'span' || item.docType === 'transaction'
  ) as IWaterfallSpanOrTransaction[];

  const legends = [
    WaterfallLegendType.ServiceName,
    WaterfallLegendType.SpanType,
  ].flatMap((legendType) => {
    const allLegendValues = uniq(
      onlyBaseSpanItems.map((item) => item.legendValues[legendType])
    );

    const palette = euiPaletteColorBlind({
      rotations: Math.ceil(allLegendValues.length / 10),
    });

    return allLegendValues.map((value, index) => ({
      type: legendType,
      value,
      color: palette[index],
    }));
  });

  return legends;
}

const getWaterfallDuration = (waterfallItems: IWaterfallItem[]) =>
  Math.max(
    ...waterfallItems.map(
      (item) =>
        item.offset + item.skew + ('duration' in item ? item.duration : 0)
    ),
    0
  );

const getWaterfallItems = (
  items: Array<Transaction | Span>,
  linkedChildrenOfSpanCountBySpanId: Record<string, number>
) =>
  items.map((item) => {
    const docType: 'span' | 'transaction' = item.processor.event;
    switch (docType) {
      case 'span': {
        const span = item as Span;
        return getSpanItem(
          span,
          linkedChildrenOfSpanCountBySpanId[span.span.id]
        );
      }
      case 'transaction':
        const transaction = item as Transaction;
        return getTransactionItem(
          transaction,
          linkedChildrenOfSpanCountBySpanId[transaction.transaction.id]
        );
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

const getChildrenGroupedByParentId = (
  waterfallItems: IWaterfallSpanOrTransaction[]
) =>
  groupBy(waterfallItems, (item) => (item.parentId ? item.parentId : ROOT_ID));

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
  errorDocs: WaterfallErrorDoc[],
  items: IWaterfallItem[],
  entryWaterfallTransaction?: IWaterfallTransaction
) {
  const errorItems = errorDocs.map((errorDoc) =>
    getErrorItem(errorDoc, items, entryWaterfallTransaction)
  );
  if (!entryWaterfallTransaction) {
    return errorItems;
  }
  const parentIdLookup = [...items, ...errorItems].reduce(
    (map, { id, parentId }) => {
      map.set(id, parentId ?? ROOT_ID);
      return map;
    },
    new Map<string, string>()
  );
  return errorItems.filter((errorItem) =>
    isInEntryTransaction(
      parentIdLookup,
      entryWaterfallTransaction?.id,
      errorItem.id
    )
  );
}

// map parent.id to the number of errors
/*
  { 'parentId': 2 }
  */
function getErrorCountByParentId(waterfalErrorDocs: WaterfallErrorDoc[]) {
  return waterfalErrorDocs.reduce<Record<string, number>>((acc, doc) => {
    const parentId = doc.parent?.id;

    if (!parentId) {
      return acc;
    }

    acc[parentId] = (acc[parentId] ?? 0) + 1;

    return acc;
  }, {});
}

function addColorToItems({
  legends,
  items,
}: {
  legends: ReturnType<typeof getLegends>;
  items: IWaterfallSpanOrTransaction[];
}) {
  // Service colors are needed to color the dot in the error popover
  const serviceLegends = legends.filter(
    ({ type }) => type === WaterfallLegendType.ServiceName
  );
  const serviceColors = serviceLegends.reduce((colorMap, legend) => {
    return {
      ...colorMap,
      [legend.value!]: legend.color,
    };
  }, {} as Record<string, string>);

  // only color by span type if there are only events for one service
  const colorBy =
    serviceLegends.length > 1
      ? WaterfallLegendType.ServiceName
      : WaterfallLegendType.SpanType;

  const displayedLegends = legends.filter((legend) => legend.type === colorBy);

  const legendsByValue = keyBy(displayedLegends, 'value');

  // mutate items rather than rebuilding both items and childrenByParentId
  items.forEach((item) => {
    let color = '';
    if ('legendValues' in item) {
      color = legendsByValue[item.legendValues[colorBy]].color;
    }

    if (!color) {
      // fall back to service color if there's no span.type, e.g. for transactions
      color = serviceColors[item.doc.service.name];
    }

    item.color = color;
  });
}

export const INITIAL_DATA: IWaterfall = {
  entryWaterfallTransaction: undefined,
  rootTransaction: undefined,
  exceedsMax: false,
  totalErrorsCount: 0,
  duration: 0,
  items: [],
  legends: [],
  errorItems: [],
  childrenByParentId: {},
  errorCountById: {},
};

export function getWaterfall(
  traceItems: TraceItems,
  entryTransactionId?: Transaction['transaction']['id']
): IWaterfall {
  if (isEmpty(traceItems.traceDocs) || !entryTransactionId) {
    return INITIAL_DATA;
  }

  const errorCountById = getErrorCountByParentId(traceItems.errorDocs);

  const waterfallItems: IWaterfallSpanOrTransaction[] = getWaterfallItems(
    traceItems.traceDocs,
    traceItems.linkedChildrenOfSpanCountBySpanId
  );

  const childrenByParentId = getChildrenGroupedByParentId(
    reparentSpans(waterfallItems)
  );

  const entryWaterfallTransaction = getEntryWaterfallTransaction(
    entryTransactionId,
    waterfallItems
  );

  const items = getOrderedWaterfallItems(
    childrenByParentId,
    entryWaterfallTransaction
  );
  const errorItems = getWaterfallErrors(
    traceItems.errorDocs,
    items,
    entryWaterfallTransaction
  );

  const rootTransaction = getRootTransaction(childrenByParentId);
  const duration = getWaterfallDuration(items);
  const legends = getLegends(items);
  addColorToItems({ legends, items });

  return {
    exceedsMax: traceItems.exceedsMax,
    totalErrorsCount: traceItems.errorDocs.length,
    entryWaterfallTransaction,
    rootTransaction,
    duration,
    items,
    legends,
    errorItems,
    childrenByParentId: getChildrenGroupedByParentId(items),
    errorCountById,
  };
}
