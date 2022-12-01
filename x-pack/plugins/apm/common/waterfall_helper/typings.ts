/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { ErrorRaw } from '../../typings/es_schemas/raw/error_raw';
import { EventOutcome } from '../../typings/es_schemas/raw/fields/event_outcome';
import { Faas } from '../../typings/es_schemas/raw/fields/faas';
import { Service } from '../../typings/es_schemas/raw/fields/service';
import { SpanLink } from '../../typings/es_schemas/raw/fields/span_links';
import { TimestampUs } from '../../typings/es_schemas/raw/fields/timestamp_us';
import { Agent } from '../../typings/es_schemas/ui/fields/agent';
import { Transaction } from '../../typings/es_schemas/ui/transaction';
import { SpanLinksCount } from '../span_links';

// API return type
export interface TraceItems {
  exceedsMax: boolean;
  traceDocs: Array<WaterfallTransactionDoc | WaterfallSpanDoc>;
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
  transaction: { id?: string };
  parent: { id?: string };
  error: ErrorRaw['error'];
  service: {
    name: string;
  };
}

export interface WaterfallTransactionSpanBaseDoc {
  timestamp: TimestampUs;
  trace: { id: string };
  service: Service;
  agent: Agent;
  event?: { outcome?: EventOutcome };
  parent?: { id?: string };
}

/*
 * Custom waterfall transaction doc
 */
export interface WaterfallTransactionDoc
  extends WaterfallTransactionSpanBaseDoc {
  processor: { event: ProcessorEvent.transaction };
  transaction: {
    duration: { us: number };
    id: string;
    name: string;
    type: string;
    result?: string;
  };
  faas?: Faas;
  span?: {
    links?: SpanLink[];
  };
}

/*
 * Custom waterfall span doc
 */
export interface WaterfallSpanDoc extends WaterfallTransactionSpanBaseDoc {
  processor: { event: ProcessorEvent.span };
  span: {
    id: string;
    type: string;
    subtype?: string;
    action?: string;
    name: string;
    composite?: {
      count: number;
      sum: { us: number };
      compression_strategy: string;
    };
    sync?: boolean;
    duration: { us: number };
    links?: SpanLink[];
  };
  child?: { id: string[] };
}

export type IWaterfallError = IWaterfallItemBase<
  WaterfallErrorDoc,
  ProcessorEvent.error
>;

export type IWaterfallSpan = IWaterfallTransactionSpanItemBase<
  WaterfallSpanDoc,
  ProcessorEvent.span
>;

export type IWaterfallTransaction = IWaterfallTransactionSpanItemBase<
  WaterfallTransactionDoc,
  ProcessorEvent.transaction
>;

export type IWaterfallSpanOrTransaction =
  | IWaterfallTransaction
  | IWaterfallSpan;

export interface IWaterfall {
  entryTransaction?: Transaction;
  entryWaterfallTransaction?: IWaterfallTransaction;
  rootWaterfallTransaction?: IWaterfallTransaction;
  items: IWaterfallSpanOrTransaction[];
  childrenByParentId: Record<string | number, IWaterfallSpanOrTransaction[]>;
  errorCountById: Record<string, number>;
  legends: IWaterfallLegend[];
  errorItems: IWaterfallError[];
  exceedsMax: boolean;
  totalErrorsCount: number;
  /**
   * Latency in us
   */
  duration: number;
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
