/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ErrorRaw } from '../../typings/es_schemas/raw/error_raw';
import { TimestampUs } from '../../typings/es_schemas/raw/fields/timestamp_us';
import { Span } from '../../typings/es_schemas/ui/span';
import { Transaction } from '../../typings/es_schemas/ui/transaction';

// API return type
export interface TraceItems {
  exceedsMax: boolean;
  traceDocs: Array<Transaction | Span>;
  errorDocs: WaterfallErrorDoc[];
  linkedChildrenOfSpanCountBySpanId: Record<string, number>;
}

export interface WaterfallErrorDoc {
  timestamp: TimestampUs;
  trace: { id?: string };
  transaction: {
    id?: string;
  };
  parent: { id?: string };
  error: ErrorRaw['error'];
  service: {
    name: string;
  };
}

// export interface WaterfallTransactionDoc {}
// export interface WaterfallSpanDoc {}

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

export type IWaterfallError = IWaterfallItemBase<WaterfallErrorDoc, 'error'>;

interface IWaterfallSpanItemBase<TDocument, TDoctype>
  extends IWaterfallItemBase<TDocument, TDoctype> {
  /**
   * Latency in us
   */
  duration: number;
  legendValues: Record<WaterfallLegendType, string>;
  spanLinksCount: SpanLinksCount;
}
export type IWaterfallTransaction = IWaterfallSpanItemBase<
  Transaction,
  'transaction'
>;
export type IWaterfallSpan = IWaterfallSpanItemBase<Span, 'span'>;

export type IWaterfallSpanOrTransaction =
  | IWaterfallTransaction
  | IWaterfallSpan;

export type EntryWaterfallTransaction = IWaterfallSpanItemBase<
  Transaction,
  'transaction'
>;

export interface RootTransaction {
  trace: { id: string };
  transaction: {
    duration: TimestampUs;
    id: string;
    name: string;
    type: string;
  };
  service: {
    name: string;
    environment?: string;
  };
}

export interface IWaterfall {
  entryWaterfallTransaction?: EntryWaterfallTransaction;
  rootTransaction?: RootTransaction;

  /**
   * Latency in us
   */
  duration: number;
  items: IWaterfallSpanOrTransaction[];
  childrenByParentId: Record<string | number, IWaterfallSpanOrTransaction[]>;
  errorCountById: Record<string, number>;
  legends: IWaterfallLegend[];
  errorItems: IWaterfallError[];
  exceedsMax: boolean;
  totalErrorsCount: number;
}

/*
 * Legends types
 */

export enum WaterfallLegendType {
  ServiceName = 'serviceName',
  SpanType = 'spanType',
}

export interface IWaterfallLegend {
  type: WaterfallLegendType;
  value: string | undefined;
  color: string;
}

/*
 * Span links type
 */

export interface SpanLinksCount {
  linkedChildren: number;
  linkedParents: number;
}
