/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { usePageUrlState } from '../../util/url_state';
import { TimeSeriesExplorerAppState } from '../../../../common/types/ml_url_generator';
import { ML_PAGES } from '../../../../common/constants/ml_url_generator';

export function useTimeSeriesExplorerUrlState() {
  return usePageUrlState<TimeSeriesExplorerAppState>(ML_PAGES.SINGLE_METRIC_VIEWER);
}
