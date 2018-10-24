/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { groupBy, indexBy, sortBy } from 'lodash';
import { Span } from '../../../../../../../../typings/Span';
import { Transaction } from '../../../../../../../../typings/Transaction';

export interface IWaterfallIndex {
  [key: string]: IWaterfallItem;
}

export interface IWaterfall {
  duration: number;
  services: string[];
  childrenCount: number;
  root: IWaterfallItem;
  itemsById: IWaterfallIndex;
}

interface IWaterfallItemBase {
  id: string | number;
  parentId?: string;
  serviceName: string;
  name: string;
  duration: number;
  timestamp: number;
  offset: number;
}

interface IWaterfallItemTransaction extends IWaterfallItemBase {
  transaction: Transaction;
  docType: 'transaction';
  children?: Array<IWaterfallItemSpan | IWaterfallItemTransaction>;
}

interface IWaterfallItemSpan extends IWaterfallItemBase {
  parentTransaction: Transaction;
  span: Span;
  docType: 'span';
  children?: Array<IWaterfallItemSpan | IWaterfallItemTransaction>;
}

export type IWaterfallItem = IWaterfallItemSpan | IWaterfallItemTransaction;

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

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

type PartialSpanItem = Omit<IWaterfallItemSpan, 'parentTransaction'>;

function getSpanItem(span: Span): PartialSpanItem {
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

export function getWaterfallRoot(
  items: Array<PartialSpanItem | IWaterfallItemTransaction>,
  entryTransactionItem: IWaterfallItem
) {
  const itemsByParentId = groupBy(
    items,
    item => (item.parentId ? item.parentId : 'root')
  );
  const itemsById: IWaterfallIndex = {};

  const itemsByTransactionId = indexBy(
    items.filter(item => item.docType === 'transaction'),
    item => item.id
  ) as { [key: string]: IWaterfallItemTransaction };

  function getWithChildren(
    item: PartialSpanItem | IWaterfallItemTransaction
  ): IWaterfallItem {
    const children = itemsByParentId[item.id] || [];
    const nextChildren = sortBy(children, 'timestamp').map(getWithChildren);
    let fullItem;

    // add parent transaction to spans
    if (item.docType === 'span') {
      fullItem = {
        parentTransaction:
          itemsByTransactionId[item.span.transaction.id].transaction,
        ...item,
        offset: item.timestamp - entryTransactionItem.timestamp,
        children: nextChildren
      };
    } else {
      fullItem = {
        ...item,
        offset: item.timestamp - entryTransactionItem.timestamp,
        children: nextChildren
      };
    }

    // TODO: Think about storing this tree as a single, flat, indexed structure
    // with "children" being an array of ids, instead of it being a real tree
    itemsById[item.id] = fullItem;

    return fullItem;
  }

  return { root: getWithChildren(entryTransactionItem), itemsById };
}

export function getWaterfall(
  hits: Array<Span | Transaction>,
  services: string[],
  entryTransaction: Transaction
): IWaterfall {
  const items = hits
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

  const entryTransactionItem = getTransactionItem(entryTransaction);
  const { root, itemsById } = getWaterfallRoot(items, entryTransactionItem);
  return {
    duration: root.duration,
    services,
    childrenCount: hits.length,
    root,
    itemsById
  };
}
