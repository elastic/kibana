/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flatten, groupBy, indexBy, sortBy } from 'lodash';
import { Span } from '../../../../../../../../typings/Span';
import { Transaction } from '../../../../../../../../typings/Transaction';

export interface IWaterfallIndex {
  [key: string]: IWaterfallItem;
}

export interface IWaterfall {
  rootTransaction?: Transaction;
  rootTransactionDuration?: number;
  duration: number;
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
    docType: 'span',
    span
  };
}

export function getWaterfallItems(
  items: IWaterfallItem[],
  entryTransactionItem: IWaterfallItem
) {
  const itemsById: IWaterfallIndex = indexBy(items, 'id');
  const childrenByParentId = groupBy(
    items,
    item => (item.parentId ? item.parentId : 'root')
  );

  function getOrderedItems(item: IWaterfallItem): IWaterfallItem[] {
    const children = sortBy(childrenByParentId[item.id] || [], 'timestamp');

    // mutating to ensure both data structures ("itemsById" and "items") have the same data
    item.childIds = children.map(child => child.id);
    item.offset = item.timestamp - entryTransactionItem.timestamp;

    const deepChildren = flatten(children.map(getOrderedItems));
    return [item, ...deepChildren];
  }

  return {
    items: getOrderedItems(entryTransactionItem),
    itemsById
  };
}

function getRootTransaction(filteredHits: IWaterfallItem[]) {
  const rootTransaction = filteredHits.find(hit => {
    return hit.docType === 'transaction' && !hit.parentId;
  });

  if (rootTransaction && rootTransaction.docType === 'transaction') {
    return rootTransaction.transaction;
  }
}

export function getWaterfall(
  hits: Array<Span | Transaction>,
  services: string[],
  entryTransaction: Transaction
): IWaterfall {
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

  const rootTransaction = getRootTransaction(filteredHits);
  const entryTransactionItem = getTransactionItem(entryTransaction);
  const { items, itemsById } = getWaterfallItems(
    filteredHits,
    entryTransactionItem
  );

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
    rootTransaction,
    rootTransactionDuration:
      rootTransaction && rootTransaction.transaction.duration.us,
    duration: entryTransaction.transaction.duration.us,
    services,
    items,
    itemsById,
    getTransactionById
  };
}
