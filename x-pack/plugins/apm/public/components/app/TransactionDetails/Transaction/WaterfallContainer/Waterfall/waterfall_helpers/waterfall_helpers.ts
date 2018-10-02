/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { groupBy, sortBy } from 'lodash';
import { Span } from '../../../../../../../../typings/Span';
import { Transaction } from '../../../../../../../../typings/Transaction';

export interface IWaterfallItem {
  transaction?: Transaction;
  span?: Span;
  id: string;
  parentId?: string;
  serviceName: string;
  name: string;
  duration: number;
  timestamp: string;
  offset: number;
  eventType: string;
  children?: IWaterfallItem[];
}

export function getTransactionItem(transaction: Transaction): IWaterfallItem {
  const timestamp = transaction['@timestamp'];

  return {
    id: transaction.transaction.id,
    parentId: transaction.parent && transaction.parent.id,
    serviceName: transaction.context.service.name,
    name: transaction.transaction.name,
    duration: transaction.transaction.duration.us,
    timestamp,
    offset: 0,
    eventType: 'transaction',
    transaction
  };
}

export function getSpanItem(span: Span): IWaterfallItem {
  const timestamp = span['@timestamp'];

  return {
    id: span.span.hex_id!, // TODO: make sure this is compatible with v1
    parentId: span.parent && span.parent.id,
    serviceName: span.context.service.name,
    name: span.span.name,
    duration: span.span.duration.us,
    timestamp,
    offset: 0,
    eventType: 'span',
    span
  };
}

export function getOffset(t1: string, t2: string) {
  return (new Date(t2).getTime() - new Date(t1).getTime()) * 1000;
}

export function getWaterfallRoot(
  items: IWaterfallItem[],
  entryTransactionItem: IWaterfallItem
) {
  const groupedItems = groupBy(
    items,
    item => (item.parentId ? item.parentId : 'root')
  );

  function findChildren(parent: IWaterfallItem): IWaterfallItem {
    const children = groupedItems[parent.id] || [];
    const nextChildren = sortBy(children, 'timestamp').map(findChildren);
    return {
      ...parent,
      offset: getOffset(entryTransactionItem.timestamp, parent.timestamp),
      children: nextChildren
    };
  }

  return findChildren(entryTransactionItem);
}

export interface IWaterfall {
  duration: number;
  services: string[];
  childrenCount: number;
  root: IWaterfallItem;
}

export function getWaterfall(
  hits: Array<Span | Transaction>,
  services: string[],
  entryTransaction: Transaction
): IWaterfall {
  const items = hits
    .map(hit => {
      const eventType = hit.processor.event;
      switch (eventType) {
        case 'span':
          return getSpanItem(hit as Span);
        case 'transaction':
          return getTransactionItem(hit as Transaction);
        default:
          return null;
      }
    })
    .filter(removeEmpty);

  const entryTransactionItem = getTransactionItem(entryTransaction);
  const root = getWaterfallRoot(items, entryTransactionItem);
  return {
    duration: root.duration,
    services,
    childrenCount: hits.length,
    root
  };
}

function removeEmpty<T>(value: T | null): value is T {
  return value !== null;
}
