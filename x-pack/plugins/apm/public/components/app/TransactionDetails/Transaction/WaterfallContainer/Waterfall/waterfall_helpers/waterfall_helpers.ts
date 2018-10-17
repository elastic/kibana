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
  id: string | number;
  parentId?: string;
  serviceName: string;
  name: string;
  duration: number;
  timestamp: number;
  offset: number;
  docType: string;
  children?: IWaterfallItem[];
}

function getTransactionItem(transaction: Transaction): IWaterfallItem {
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

function getSpanItem(span: Span): IWaterfallItem {
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
  items: IWaterfallItem[],
  entryTransactionItem: IWaterfallItem
) {
  const itemsByParentId = groupBy(
    items,
    item => (item.parentId ? item.parentId : 'root')
  );

  function getWithChildren(item: IWaterfallItem): IWaterfallItem {
    const children = itemsByParentId[item.id] || [];
    const nextChildren = sortBy(children, 'timestamp').map(getWithChildren);
    return {
      ...item,
      offset: item.timestamp - entryTransactionItem.timestamp,
      children: nextChildren
    };
  }

  return getWithChildren(entryTransactionItem);
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
    .filter(hit => {
      const docType = hit.processor.event;
      return ['span', 'transaction'].includes(docType);
    })
    .map(addVersion)
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

  const entryTransactionItem = getTransactionItem(addVersion(entryTransaction));
  const root = getWaterfallRoot(items, entryTransactionItem);
  return {
    duration: root.duration,
    services,
    childrenCount: hits.length,
    root
  };
}

function addVersion<T extends Transaction | Span>(hit: T): T {
  hit.version = hit.hasOwnProperty('trace') ? 'v2' : 'v1';
  return hit;
}
