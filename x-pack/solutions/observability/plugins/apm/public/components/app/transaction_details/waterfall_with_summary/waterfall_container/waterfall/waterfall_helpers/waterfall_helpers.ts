/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Error } from '@kbn/apm-types';
import type {
  IWaterfallLegend,
  WaterfallLegendType,
} from '../../../../../../../../common/waterfall/legend';
import type {
  WaterfallSpan,
  WaterfallTransaction,
} from '../../../../../../../../common/waterfall/typings';
import type { Transaction } from '../../../../../../../../typings/es_schemas/ui/transaction';

// TODO: caue clean up the interfaces
export interface SpanLinksCount {
  linkedChildren: number;
  linkedParents: number;
}

export interface IWaterfall {
  entryTransaction?: Transaction;
  entryWaterfallTransaction?: IWaterfallTransaction;
  rootWaterfallTransaction?: IWaterfallTransaction;

  /**
   * Latency in us
   */
  duration: number;
  items: IWaterfallItem[];
  childrenByParentId: Record<string | number, IWaterfallSpanOrTransaction[]>;
  getErrorCount: (parentId: string) => number;
  legends: IWaterfallLegend[];
  colorBy: WaterfallLegendType;
  errorItems: IWaterfallError[];
  exceedsMax: boolean;
  totalErrorsCount: number;
  traceDocsTotal: number;
  maxTraceItems: number;
  orphanTraceItemsCount: number;
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
  /**
   * Latency in us
   */
  duration: number;
  legendValues: Record<WaterfallLegendType, string>;
  spanLinksCount: SpanLinksCount;
  isOrphan?: boolean;
  missingDestination?: boolean;
}

export type IWaterfallError = Omit<
  IWaterfallItemBase<Error, 'error'>,
  'duration' | 'legendValues' | 'spanLinksCount'
>;

export type IWaterfallTransaction = IWaterfallItemBase<WaterfallTransaction, 'transaction'>;

export type IWaterfallSpan = IWaterfallItemBase<WaterfallSpan, 'span'>;

export type IWaterfallSpanOrTransaction = IWaterfallTransaction | IWaterfallSpan;

export type IWaterfallItem = IWaterfallSpanOrTransaction;

export interface IWaterfallNode {
  id: string;
  item: IWaterfallItem;
  // children that are loaded
  children: IWaterfallNode[];
  // total number of children that needs to be loaded
  childrenToLoad: number;
  // collapsed or expanded state
  expanded: boolean;
  // level in the tree
  level: number;
  // flag to indicate if children are loaded
  hasInitializedChildren: boolean;
}

export type IWaterfallNodeFlatten = Omit<IWaterfallNode, 'children'>;
