/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate-latest';
import { useState } from 'react';
import { MetricsExplorerColor } from '../../../common/color_palette';
import {
  MetricsExplorerAggregation,
  MetricsExplorerMetric,
} from '../../../server/routes/metrics_explorer/types';

export interface MetricsExplorerOptions {
  metrics: MetricsExplorerMetric[];
  afterKey?: string | null;
  limit?: number;
  groupBy?: string;
  filterQuery?: string;
}

export interface MetricsExplorerTimeOptions {
  from: string;
  to: string;
  interval: string;
}

const DEFAULT_TIMERANGE: MetricsExplorerTimeOptions = {
  from: 'now-1h',
  to: 'now',
  interval: '>=10s',
};

const DEFAULT_OPTIONS: MetricsExplorerOptions = {
  metrics: [
    {
      aggregation: MetricsExplorerAggregation.count,
      color: MetricsExplorerColor.color0,
    },
  ],
};

export const useMetricsExplorerOptions = () => {
  const [options, setOptions] = useState<MetricsExplorerOptions>(DEFAULT_OPTIONS);
  const [currentTimerange, setTimeRange] = useState<MetricsExplorerTimeOptions>(DEFAULT_TIMERANGE);
  const [isAutoReloading, setAutoReloading] = useState<boolean>(false);
  return {
    options,
    currentTimerange,
    isAutoReloading,
    setOptions,
    setTimeRange,
    startAutoReload: () => setAutoReloading(true),
    stopAutoReload: () => setAutoReloading(false),
  };
};

export const MetricsExplorerOptionsContainer = createContainer(useMetricsExplorerOptions);
