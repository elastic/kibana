/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RootTransaction,
  WaterfallErrorDoc,
} from '../../../../../../../../common/watefall';
import type { Span } from '../../../../../../../../typings/es_schemas/ui/span';
import type { Transaction } from '../../../../../../../../typings/es_schemas/ui/transaction';

interface IWaterfallGroup {
  [key: string]: IWaterfallSpanOrTransaction[];
}

const ROOT_ID = 'root';

export interface SpanLinksCount {
  linkedChildren: number;
  linkedParents: number;
}

export enum WaterfallLegendType {
  ServiceName = 'serviceName',
  SpanType = 'spanType',
}

export interface IWaterfall {
  entryWaterfallTransaction?: IWaterfallTransaction;
  rootTransaction?: RootTransaction;

  /**
   * Latency in us
   */
  duration: number;
  items: IWaterfallItem[];
  childrenByParentId: Record<string | number, IWaterfallSpanOrTransaction[]>;
  errorCountById: Record<string, number>;
  legends: IWaterfallLegend[];
  errorItems: IWaterfallError[];
  exceedsMax: boolean;
  totalErrorsCount: number;
}

interface IWaterfallSpanItemBase<TDocument, TDoctype>
  extends IWaterfallItemBase<TDocument, TDoctype> {
  /**
   * Latency in us
   */
  duration: number;
  legendValues: Record<WaterfallLegendType, string>;
  spanLinksCount: SpanLinksCount;
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

export type IWaterfallError = IWaterfallItemBase<WaterfallErrorDoc, 'error'>;

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
