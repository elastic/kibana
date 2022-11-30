/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ErrorRaw } from '../../typings/es_schemas/raw/error_raw';
import { EventOutcome } from '../../typings/es_schemas/raw/fields/event_outcome';
import { Http } from '../../typings/es_schemas/raw/fields/http';
import { Stackframe } from '../../typings/es_schemas/raw/fields/stackframe';
import { TimestampUs } from '../../typings/es_schemas/raw/fields/timestamp_us';
import { Url } from '../../typings/es_schemas/raw/fields/url';
import { Agent } from '../../typings/es_schemas/ui/fields/agent';
import { Span } from '../../typings/es_schemas/ui/span';
import { Transaction } from '../../typings/es_schemas/ui/transaction';

// API return type
export interface TraceItems {
  exceedsMax: boolean;
  traceDocs: Array<Transaction | Span>;
  errorDocs: WaterfallErrorDoc[];
  linkedChildrenOfSpanCountBySpanId: Record<string, number>;
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

interface IWaterfallTransactionSpanItemBase<TDocument, TDoctype>
  extends IWaterfallItemBase<TDocument, TDoctype> {
  /**
   * Latency in us
   */
  duration: number;
  legendValues: Record<WaterfallLegendType, string>;
  spanLinksCount: SpanLinksCount;
}

/*
 * Custom waterfall error doc
 */
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
export type IWaterfallError = IWaterfallItemBase<WaterfallErrorDoc, 'error'>;

interface WaterfallTransactionSpanBaseDoc {
  timestamp: TimestampUs;
  trace: { id: string };
  service: {
    name: string;
  };
}

/*
 * Custom waterfall transaction doc
 */
export interface WaterfallTransactionDoc
  extends WaterfallTransactionSpanBaseDoc {
  transaction: {};
}
export type IWaterfallTransaction = IWaterfallTransactionSpanItemBase<
  Transaction,
  'transaction'
>;

/*
 * Custom waterfall span doc
 */
export interface WaterfallSpanDoc extends WaterfallTransactionSpanBaseDoc {
  span: {
    subtype?: string;
    type: string;
    action?: string;
    name: string;
    composite?: {
      count: number;
      sum: { us: number };
      compression_strategy: string;
    };
    sync?: boolean;
    duration: { us: number };
    // from this point on all fields are used in the flyout
    stacktrace?: Stackframe[];
    db?: {
      statement?: string;
      type?: string;
    };
    http?: {
      url?: {
        original?: string;
      };
      response: {
        status_code: number;
      };
      method?: string;
    };
    id: string;
    destination?: {
      service: {
        resource: string;
      };
    };
  };
  agent: Agent;
  child?: { id: string[] };
  event?: { outcome?: EventOutcome };
  // from this point on all fields are used in the flyout
  url?: Url;
  http?: Http;
}
export type IWaterfallSpan = IWaterfallTransactionSpanItemBase<
  WaterfallSpanDoc,
  'span'
>;

export type IWaterfallSpanOrTransaction =
  | IWaterfallTransaction
  | IWaterfallSpan;

export type EntryWaterfallTransaction = IWaterfallTransactionSpanItemBase<
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
