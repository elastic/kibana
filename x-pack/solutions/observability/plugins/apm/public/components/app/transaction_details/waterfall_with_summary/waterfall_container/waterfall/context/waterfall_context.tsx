/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Dictionary } from 'lodash';
import React from 'react';
import { type CriticalPathSegment } from '../../../../../../shared/trace_waterfall/critical_path';
import type {
  IWaterfall,
  IWaterfallNodeFlatten,
  IWaterfallSpanOrTransaction,
} from '../waterfall_helpers/waterfall_helpers';

export interface WaterfallContextProps {
  waterfall: IWaterfall;
  showCriticalPath: boolean;
  maxLevelOpen: number;
  isOpen: boolean;
  isEmbeddable: boolean;
}

/** TODO REMOVE IT */
export const WaterfallContext = React.createContext<
  {
    criticalPathSegmentsById: Dictionary<CriticalPathSegment<IWaterfallSpanOrTransaction>[]>;
    showCriticalPath: boolean;
    traceList: IWaterfallNodeFlatten[];
    getErrorCount: (waterfallItemId: string) => number;
    updateTreeNode: (newTree: IWaterfallNodeFlatten) => void;
    isEmbeddable: boolean;
  } & Pick<WaterfallContextProps, 'showCriticalPath'>
>({
  criticalPathSegmentsById: {} as Dictionary<CriticalPathSegment<IWaterfallSpanOrTransaction>[]>,
  showCriticalPath: false,
  traceList: [],
  getErrorCount: () => 0,
  updateTreeNode: () => undefined,
  isEmbeddable: false,
});
