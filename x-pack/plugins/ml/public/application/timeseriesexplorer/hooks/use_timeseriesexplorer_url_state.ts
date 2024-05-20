/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { usePageUrlState } from '@kbn/ml-url-state';
import type { TimeSeriesExplorerAppState } from '../../../../common/types/locator';
import { ML_PAGES } from '../../../../common/constants/locator';

interface TimeSeriesExplorerPageUrlState {
  pageKey: typeof ML_PAGES.SINGLE_METRIC_VIEWER;
  pageUrlState: TimeSeriesExplorerAppState;
}

export function useTimeSeriesExplorerUrlState() {
  return usePageUrlState<TimeSeriesExplorerPageUrlState>(ML_PAGES.SINGLE_METRIC_VIEWER);
}
