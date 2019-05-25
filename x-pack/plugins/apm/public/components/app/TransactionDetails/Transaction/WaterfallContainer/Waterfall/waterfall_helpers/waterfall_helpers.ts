/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import theme from '@elastic/eui/dist/eui_theme_light.json';
import {
  first,
  flatten,
  groupBy,
  indexBy,
  isEmpty,
  sortBy,
  uniq,
  zipObject
} from 'lodash';
import { idx } from '@kbn/elastic-idx';
import { TraceAPIResponse } from '../../../../../../../../server/lib/traces/get_trace';
import { StringMap } from '../../../../../../../../typings/common';
import { Span } from '../../../../../../../../typings/es_schemas/ui/Span';
import { Transaction } from '../../../../../../../../typings/es_schemas/ui/Transaction';

interface IWaterfallIndex {
  [key: string]: IWaterfallItem;
}

interface IWaterfallGroup {
  [key: string]: IWaterfallItem[];
}

export interface IWaterfall {
  traceRoot?: Transaction;
  traceRootDuration?: number;

  /**
   * Duration in us
   */
  duration: number;
  services: string[];
  orderedItems: IWaterfallItem[];
  itemsById: IWaterfallIndex;
  getTransactionById: (id?: IWaterfallItem['id']) => Transaction | undefined;
  errorCountByTransactionId: TraceAPIResponse['errorsPerTransaction'];
  serviceColors: IServiceColors;
}

interface IWaterfallItemBase {
  id: string | number;
  parentId?: string;
  serviceName: string;
  name: string;

  /**
   * Duration in us
   */
  duration: number;

  /**
   * start timestamp in us
   */
  timestamp: number;

  /**
   * offset from first item in us
   */
  offset: number;

  /**
   * skew from timestamp in us
   */
  skew: number;
  childIds?: Array<IWaterfallItemBase['id']>;
}

interface IWaterfallItemTransaction extends IWaterfallItemBase {
  transaction: Transaction;
  docType: 'transaction';
  errorCount: number;
}

interface IWaterfallItemSpan extends IWaterfallItemBase {
  span: Span;
  docType: 'span';
}

export type IWaterfallItem = IWaterfallItemSpan | IWaterfallItemTransaction;

function getTransactionItem(
  transaction: Transaction,
  errorsPerTransaction: TraceAPIResponse['errorsPerTransaction']
): IWaterfallItemTransaction {
  return {
    id: transaction.transaction.id,
    parentId: transaction.parent && transaction.parent.id,
    serviceName: transaction.service.name,
    name: transaction.transaction.name,
    duration: transaction.transaction.duration.us,
    timestamp: transaction.timestamp.us,
    offset: 0,
    skew: 0,
    docType: 'transaction',
    transaction,
    errorCount: errorsPerTransaction[transaction.transaction.id] || 0
  };
}

function getSpanItem(span: Span): IWaterfallItemSpan {
  return {
    id: span.span.id,
    parentId: span.parent && span.parent.id,
    serviceName: span.service.name,
    name: span.span.name,
    duration: span.span.duration.us,
    timestamp: span.timestamp.us,
    offset: 0,
    skew: 0,
    docType: 'span',
    span
  };
}

export function getClockSkew(
  item: IWaterfallItem,
  parentItem?: IWaterfallItem
) {
  if (!parentItem) {
    return 0;
  }

  switch (item.docType) {
    // don't calculate skew for spans. Just use parent's skew
    case 'span':
      return parentItem.skew;

    // transaction is the inital entry in a service. Calculate skew for this, and it will be propogated to all child spans
    case 'transaction': {
      const parentStart = parentItem.timestamp + parentItem.skew;

      // determine if child starts before the parent
      const offsetStart = parentStart - item.timestamp;
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
  entryTransactionItem: IWaterfallItem
) {
  const visitedWaterfallItemSet = new Set();
  function getSortedChildren(
    item: IWaterfallItem,
    parentItem?: IWaterfallItem
  ): IWaterfallItem[] {
    if (visitedWaterfallItemSet.has(item)) {
      return [];
    }
    visitedWaterfallItemSet.add(item);
    const children = sortBy(childrenByParentId[item.id] || [], 'timestamp');

    item.childIds = children.map(child => child.id);
    item.offset = item.timestamp - entryTransactionItem.timestamp;
    item.skew = getClockSkew(item, parentItem);

    const deepChildren = flatten(
      children.map(child => getSortedChildren(child, item))
    );
    return [item, ...deepChildren];
  }

  return getSortedChildren(entryTransactionItem);
}

function getTraceRoot(childrenByParentId: IWaterfallGroup) {
  const item = first(childrenByParentId.root);
  if (item && item.docType === 'transaction') {
    return item.transaction;
  }
}

function getServices(items: IWaterfallItem[]) {
  const serviceNames = items.map(item => item.serviceName);
  return uniq(serviceNames);
}

export type IServiceColors = StringMap<string>;

function getServiceColors(services: string[]) {
  const assignedColors = [
    theme.euiColorVis1,
    theme.euiColorVis0,
    theme.euiColorVis3,
    theme.euiColorVis2,
    theme.euiColorVis6,
    theme.euiColorVis7,
    theme.euiColorVis5
  ];

  return zipObject(services, assignedColors) as IServiceColors;
}

function getDuration(items: IWaterfallItem[]) {
  if (items.length === 0) {
    return 0;
  }
  const timestampStart = items[0].timestamp;
  const timestampEnd = Math.max(
    ...items.map(item => item.timestamp + item.duration + item.skew)
  );
  return timestampEnd - timestampStart;
}

function createGetTransactionById(itemsById: IWaterfallIndex) {
  return (id?: IWaterfallItem['id']) => {
    if (!id) {
      return undefined;
    }

    const item = itemsById[id];
    if (idx(item, _ => _.docType) === 'transaction') {
      return (item as IWaterfallItemTransaction).transaction;
    }
  };
}

export function getWaterfall(
  { trace, errorsPerTransaction }: TraceAPIResponse,
  entryTransactionId?: Transaction['transaction']['id']
): IWaterfall {
  if (isEmpty(trace) || !entryTransactionId) {
    return {
      services: [],
      duration: 0,
      orderedItems: [],
      itemsById: {},
      getTransactionById: () => undefined,
      errorCountByTransactionId: errorsPerTransaction,
      serviceColors: {}
    };
  }

  const waterfallItems = trace.map(traceItem => {
    const docType = traceItem.processor.event;
    switch (docType) {
      case 'span':
        return getSpanItem(traceItem as Span);
      case 'transaction':
        return getTransactionItem(
          traceItem as Transaction,
          errorsPerTransaction
        );
    }
  });

  const childrenByParentId = groupBy(waterfallItems, item =>
    item.parentId ? item.parentId : 'root'
  );
  const entryTransactionItem = waterfallItems.find(
    waterfallItem =>
      waterfallItem.docType === 'transaction' &&
      waterfallItem.id === entryTransactionId
  );
  const itemsById: IWaterfallIndex = indexBy(waterfallItems, 'id');
  const orderedItems = entryTransactionItem
    ? getOrderedWaterfallItems(childrenByParentId, entryTransactionItem)
    : [];
  const traceRoot = getTraceRoot(childrenByParentId);
  const duration = getDuration(orderedItems);
  const traceRootDuration = traceRoot && traceRoot.transaction.duration.us;
  const services = getServices(orderedItems);
  const getTransactionById = createGetTransactionById(itemsById);
  const serviceColors = getServiceColors(services);

  return {
    traceRoot,
    traceRootDuration,
    duration,
    services,
    orderedItems,
    itemsById,
    getTransactionById,
    errorCountByTransactionId: errorsPerTransaction,
    serviceColors
  };
}
