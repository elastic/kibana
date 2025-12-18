/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IWaterfallSpanOrTransaction } from '../../public/components/app/transaction_details/waterfall_with_summary/waterfall_container/waterfall/waterfall_helpers/waterfall_helpers';

/**
 * Minimal interface that any item must implement to be used in critical path calculations
 */
export interface CriticalPathItemLike {
  id: string;
  offset: number;
  duration: number;
  skew: number;
}

export interface CriticalPathSegment<T extends CriticalPathItemLike = IWaterfallSpanOrTransaction> {
  item: T;
  offset: number;
  duration: number;
  self: boolean;
}

export interface CriticalPath<T extends CriticalPathItemLike = IWaterfallSpanOrTransaction> {
  segments: CriticalPathSegment<T>[];
}
