/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiPaletteColorBlind } from '@elastic/eui';
import { first, flatten, groupBy, isEmpty, sortBy, uniq } from 'lodash';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import type { APIReturnType } from '../../../../../../../services/rest/create_call_apm_api';
import type { Transaction } from '../../../../../../../../typings/es_schemas/ui/transaction';
import {
  WaterfallError,
  WaterfallSpan,
  WaterfallTransaction,
} from '../../../../../../../../common/waterfall/typings';

type TraceAPIResponse = APIReturnType<'GET /internal/apm/traces/{traceId}'>;

const ROOT_ID = 'root';

export interface SpanLinksCount {
  linkedChildren: number;
  linkedParents: number;
}

export enum WaterfallLegendType {
  ServiceName = 'serviceName',
  SpanType = 'spanType',
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
  errorItems: IWaterfallError[];
  exceedsMax: boolean;
  totalErrorsCount: number;
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
}

export type IWaterfallError = Omit<
  IWaterfallItemBase<WaterfallError, 'error'>,
  'duration' | 'legendValues' | 'spanLinksCount'
>;

export type IWaterfallTransaction = IWaterfallItemBase<
  WaterfallTransaction,
  'transaction'
>;

export type IWaterfallSpan = IWaterfallItemBase<WaterfallSpan, 'span'>;

export type IWaterfallSpanOrTransaction =
  | IWaterfallTransaction
  | IWaterfallSpan;

export type IWaterfallItem = IWaterfallSpanOrTransaction;

export interface IWaterfallLegend {
  type: WaterfallLegendType;
  value: string | undefined;
  color: string;
}

function getLegendValues(
  transactionOrSpan: WaterfallTransaction | WaterfallSpan
) {
  return {
    [WaterfallLegendType.ServiceName]: transactionOrSpan.service.name,
    [WaterfallLegendType.SpanType]:
      transactionOrSpan.processor.event === ProcessorEvent.span
        ? (transactionOrSpan as WaterfallSpan).span.subtype ||
          (transactionOrSpan as WaterfallSpan).span.type
        : '',
  };
}

function getTransactionItem(
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

function getSpanItem(
  span: WaterfallSpan,
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
  error: WaterfallError,
  items: IWaterfallItem[],
  entryWaterfallTransaction?: IWaterfallTransaction
): IWaterfallError {
  const entryTimestamp = entryWaterfallTransaction?.doc.timestamp.us ?? 0;
  const parent = items.find(
    (waterfallItem) => waterfallItem.id === error.parent?.id
  ) as IWaterfallSpanOrTransaction | undefined;

  const errorItem: IWaterfallError = {
    docType: 'error',
    doc: error,
    id: error.error.id,
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

function getRootWaterfallTransaction(
  childrenByParentId: Record<string, IWaterfallSpanOrTransaction[]>
) {
  const item = first(childrenByParentId.root);
  if (item && item.docType === 'transaction') {
    return item;
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
        return getTransactionItem(
          transaction,
          spanLinksCountById[transaction.transaction.id]
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
function getErrorCountByParentId(
  errorDocs: TraceAPIResponse['traceItems']['errorDocs']
) {
  return errorDocs.reduce<Record<string, number>>((acc, doc) => {
    const parentId = doc.parent?.id;

    if (!parentId) {
      return acc;
    }

    acc[parentId] = (acc[parentId] ?? 0) + 1;

    return acc;
  }, {});
}

export function getWaterfall(apiResponse: TraceAPIResponse): IWaterfall {
  const { traceItems, entryTransaction } = apiResponse;
  if (isEmpty(traceItems.traceDocs) || !entryTransaction) {
    return {
      duration: 0,
      items: [],
      legends: [],
      errorItems: [],
      childrenByParentId: {},
      getErrorCount: () => 0,
      exceedsMax: false,
      totalErrorsCount: 0,
    };
  }

  const errorCountByParentId = getErrorCountByParentId(traceItems.errorDocs);

  const waterfallItems: IWaterfallSpanOrTransaction[] = getWaterfallItems(
    traceItems.traceDocs,
    traceItems.spanLinksCountById
  );

  const childrenByParentId = getChildrenGroupedByParentId(
    reparentSpans(waterfallItems)
  );

  const entryWaterfallTransaction = getEntryWaterfallTransaction(
    entryTransaction.transaction.id,
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

  const rootWaterfallTransaction =
    getRootWaterfallTransaction(childrenByParentId);

  const duration = getWaterfallDuration(items);
  const legends = getLegends(items);

  return {
    entryWaterfallTransaction,
    rootWaterfallTransaction,
    entryTransaction,
    duration,
    items,
    legends,
    errorItems,
    childrenByParentId: getChildrenGroupedByParentId(items),
    getErrorCount: (parentId: string) => errorCountByParentId[parentId] ?? 0,
    exceedsMax: traceItems.exceedsMax,
    totalErrorsCount: traceItems.errorDocs.length,
  };
}
