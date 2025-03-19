/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IWaterfallSpanOrTransaction } from '../../public/components/app/transaction_details/waterfall_with_summary/waterfall_container/waterfall/waterfall_helpers/waterfall_helpers';

export interface CriticalPathSegment {
  item: IWaterfallSpanOrTransaction;
  offset: number;
  duration: number;
  self: boolean;
}

export interface CriticalPath {
  segments: CriticalPathSegment[];
}
