/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiPaletteColorBlind } from '@elastic/eui';
import { first, flatten, groupBy, isEmpty, sortBy, uniq } from 'lodash';
import { APIReturnType } from '../../../../../../../services/rest/create_call_apm_api';
import { APMError } from '../../../../../../../../typings/es_schemas/ui/apm_error';
import { Span } from '../../../../../../../../typings/es_schemas/ui/span';
import { Transaction } from '../../../../../../../../typings/es_schemas/ui/transaction';

type TraceAPIResponse = APIReturnType<'GET /internal/apm/traces/{traceId}'>;

interface IWaterfallGroup {
  [key: string]: IWaterfallSpanOrTransaction[];
}

const ROOT_ID = 'root';

export enum WaterfallLegendType {
  ServiceName = 'serviceName',
  SpanType = 'spanType',
}

export interface IWaterfall {
  entryWaterfallTransaction?: IWaterfallTransaction;
  rootTransaction?: Transaction;

  /**
   * Latency in us
   */
  duration: number;
  items: IWaterfallItem[];
  childrenByParentId: Record<string | number, IWaterfallSpanOrTransaction[]>;
  getErrorCount: (parentId: string) => number;
  legends: IWaterfallLegend[];
  errorItems: IWaterfallError[];
  apiResponse: TraceAPIResponse;
}

interface IWaterfallSpanItemBase<TDocument, TDoctype>
  extends IWaterfallItemBase<TDocument, TDoctype> {
  /**
   * Latency in us
   */
  duration: number;
  legendValues: Record<WaterfallLegendType, string>;
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
}

export type IWaterfallError = IWaterfallItemBase<APMError, 'error'>;

export type IWaterfallTransaction = IWaterfallSpanItemBase<
  Transaction,
  'transaction'
>;

export type IWaterfallSpan = IWaterfallSpanItemBase<Span, 'span'>;

export type IWaterfallSpanOrTransaction =
  | IWaterfallTransaction
  | IWaterfallSpan;

// export type IWaterfallItem = IWaterfallSpanOrTransaction | IWaterfallError;
export type IWaterfallItem = IWaterfallSpanOrTransaction;

export interface IWaterfallLegend {
  type: WaterfallLegendType;
  value: string | undefined;
  color: string;
}

function getLegendValues(transactionOrSpan: Transaction | Span) {
  return {
    [WaterfallLegendType.ServiceName]: transactionOrSpan.service.name,
    [WaterfallLegendType.SpanType]:
      'span' in transactionOrSpan
        ? transactionOrSpan.span.subtype || transactionOrSpan.span.type
        : '',
  };
}

function getTransactionItem(transaction: Transaction): IWaterfallTransaction {
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
  };
}

function getSpanItem(span: Span): IWaterfallSpan {
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
  };
}

function getErrorItem(
  error: APMError,
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

function getRootTransaction(childrenByParentId: IWaterfallGroup) {
  const item = first(childrenByParentId.root);
  if (item && item.docType === 'transaction') {
    return item.doc;
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

const getWaterfallItems = (items: TraceAPIResponse['traceDocs']) =>
  items.map((item) => {
    const docType: 'span' | 'transaction' = item.processor.event;
    switch (docType) {
      case 'span':
        return getSpanItem(item as Span);
      case 'transaction':
        return getTransactionItem(item as Transaction);
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
  errorDocs: TraceAPIResponse['errorDocs'],
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
function getErrorCountByParentId(errorDocs: TraceAPIResponse['errorDocs']) {
  return errorDocs.reduce<Record<string, number>>((acc, doc) => {
    const parentId = doc.parent?.id;

    if (!parentId) {
      return acc;
    }

    acc[parentId] = (acc[parentId] ?? 0) + 1;

    return acc;
  }, {});
}

export function getWaterfall(
  apiResponse: TraceAPIResponse,
  entryTransactionId?: Transaction['transaction']['id']
): IWaterfall {
  if (isEmpty(apiResponse.traceDocs) || !entryTransactionId) {
    return {
      apiResponse,
      duration: 0,
      items: [],
      legends: [],
      errorItems: [],
      childrenByParentId: {},
      getErrorCount: () => 0,
    };
  }

  const errorCountByParentId = getErrorCountByParentId(apiResponse.errorDocs);

  const waterfallItems: IWaterfallSpanOrTransaction[] = getWaterfallItems(
    apiResponse.traceDocs
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
    apiResponse.errorDocs,
    items,
    entryWaterfallTransaction
  );

  const rootTransaction = getRootTransaction(childrenByParentId);
  const duration = getWaterfallDuration(items);
  const legends = getLegends(items);

  return {
    apiResponse,
    entryWaterfallTransaction,
    rootTransaction,
    duration,
    items,
    legends,
    errorItems,
    childrenByParentId: getChildrenGroupedByParentId(items),
    getErrorCount: (parentId: string) => errorCountByParentId[parentId] ?? 0,
  };
}
