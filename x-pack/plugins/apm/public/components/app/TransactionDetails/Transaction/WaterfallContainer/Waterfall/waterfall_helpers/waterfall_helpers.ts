/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  first,
  flatten,
  groupBy,
  indexBy,
  isEmpty,
  sortBy,
  uniq
} from 'lodash';
import { Span } from '../../../../../../../../typings/Span';
import { Transaction } from '../../../../../../../../typings/Transaction';

export interface IWaterfallIndex {
  [key: string]: IWaterfallItem;
}

export interface IWaterfallGroup {
  [key: string]: IWaterfallItem[];
}

export interface IWaterfall {
  traceRoot?: Transaction;
  traceRootDuration?: number;
  duration?: number;
  services: string[];
  items: IWaterfallItem[];
  itemsById: IWaterfallIndex;
  getTransactionById: (id?: IWaterfallItem['id']) => Transaction | undefined;
}

interface IWaterfallItemBase {
  id: string | number;
  parentId?: string;
  serviceName: string;
  name: string;
  duration: number;
  timestamp: number;
  offset: number;
  skew: number;
  childIds?: Array<IWaterfallItemBase['id']>;
}

interface IWaterfallItemTransaction extends IWaterfallItemBase {
  transaction: Transaction;
  docType: 'transaction';
}

interface IWaterfallItemSpan extends IWaterfallItemBase {
  span: Span;
  docType: 'span';
}

export type IWaterfallItem = IWaterfallItemSpan | IWaterfallItemTransaction;

function getTransactionItem(
  transaction: Transaction
): IWaterfallItemTransaction {
  if (transaction.version === 'v1') {
    return {
      id: transaction.transaction.id,
      serviceName: transaction.context.service.name,
      name: transaction.transaction.name,
      duration: transaction.transaction.duration.us,
      timestamp: new Date(transaction['@timestamp']).getTime() * 1000,
      offset: 0,
      skew: 0,
      docType: 'transaction',
      transaction
    };
  }

  return {
    id: transaction.transaction.id,
    parentId: transaction.parent && transaction.parent.id,
    serviceName: transaction.context.service.name,
    name: transaction.transaction.name,
    duration: transaction.transaction.duration.us,
    timestamp: transaction.timestamp.us,
    offset: 0,
    skew: 0,
    docType: 'transaction',
    transaction
  };
}

function getSpanItem(span: Span): IWaterfallItemSpan {
  if (span.version === 'v1') {
    return {
      id: span.span.id,
      parentId: span.span.parent || span.transaction.id,
      serviceName: span.context.service.name,
      name: span.span.name,
      duration: span.span.duration.us,
      timestamp:
        new Date(span['@timestamp']).getTime() * 1000 + span.span.start.us,
      offset: 0,
      skew: 0,
      docType: 'span',
      span
    };
  }

  return {
    id: span.span.hex_id,
    parentId: span.parent && span.parent.id,
    serviceName: span.context.service.name,
    name: span.span.name,
    duration: span.span.duration.us,
    timestamp: span.timestamp.us,
    offset: 0,
    skew: 0,
    docType: 'span',
    span
  };
}

function getClockSkew(
  item: IWaterfallItem,
  itemsById: IWaterfallIndex,
  parentTransactionSkew: number
) {
  // calculate clock skew for transactions with parents
  if (item.docType === 'transaction' && item.parentId) {
    const parentItem = itemsById[item.parentId];

    // determine if child starts before the parent, and in that case how much
    const diff = parentItem.timestamp + parentItem.skew - item.timestamp;

    // If child transaction starts after parent span there is no clock skew
    if (diff < 0) {
      return 0;
    }

    // latency can only be calculated if parent duration is larger than child duration
    const latency = Math.max(parentItem.duration - item.duration, 0);
    const skew = diff + latency / 2;
    return skew;
  }

  return parentTransactionSkew;
}

export function getWaterfallItems(
  childrenByParentId: IWaterfallGroup,
  itemsById: IWaterfallIndex,
  entryTransactionItem: IWaterfallItem
) {
  function getSortedChildren(
    item: IWaterfallItem,
    parentTransactionSkew: number
  ): IWaterfallItem[] {
    const skew = getClockSkew(item, itemsById, parentTransactionSkew);
    const children = sortBy(childrenByParentId[item.id] || [], 'timestamp');

    item.childIds = children.map(child => child.id);
    item.offset = item.timestamp - entryTransactionItem.timestamp;
    item.skew = skew;

    const deepChildren = flatten(
      children.map(child => getSortedChildren(child, skew))
    );
    return [item, ...deepChildren];
  }

  return getSortedChildren(entryTransactionItem, 0);
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

export function getWaterfall(
  hits: Array<Span | Transaction>,
  entryTransaction: Transaction
): IWaterfall {
  if (isEmpty(hits)) {
    return {
      services: [],
      items: [],
      itemsById: {},
      getTransactionById: () => undefined
    };
  }

  const filteredHits = hits
    .filter(hit => {
      const docType = hit.processor.event;
      return ['span', 'transaction'].includes(docType);
    })
    .map(hit => {
      const docType = hit.processor.event;
      switch (docType) {
        case 'span':
          return getSpanItem(hit as Span);
        case 'transaction':
          return getTransactionItem(hit as Transaction);
        default:
          throw new Error(`Unknown type ${docType}`);
      }
    });

  const childrenByParentId = groupBy(
    filteredHits,
    hit => (hit.parentId ? hit.parentId : 'root')
  );
  const entryTransactionItem = getTransactionItem(entryTransaction);
  const itemsById: IWaterfallIndex = indexBy(filteredHits, 'id');
  const items = getWaterfallItems(
    childrenByParentId,
    itemsById,
    entryTransactionItem
  );
  const traceRoot = getTraceRoot(childrenByParentId);

  const getTransactionById = (id?: IWaterfallItem['id']) => {
    if (!id) {
      return;
    }

    const item = itemsById[id];
    if (item.docType === 'transaction') {
      return item.transaction;
    }
  };

  return {
    traceRoot,
    traceRootDuration: traceRoot && traceRoot.transaction.duration.us,
    duration: entryTransaction.transaction.duration.us,
    services: getServices(items),
    items,
    itemsById,
    getTransactionById
  };
}
