/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IconType } from '@elastic/eui';
import type {
  ChartSeriesConfigs,
  ChartSeriesData,
  UpdateDateRange,
} from '../../../common/components/charts/common';
import type { LensAttributes } from '../../../common/components/visualization_actions/types';

export interface MetricStatItem {
  color?: string;
  description?: string;
  icon?: IconType;
  key: string;
  name?: string;
  lensAttributes?: LensAttributes;
}

export interface StatItem {
  color?: string;
  description?: string;
  icon?: IconType;
  key: string;
  name?: string;
  value: number | undefined | null;
  lensAttributes?: LensAttributes;
}

export interface StatItems {
  areachartConfigs?: ChartSeriesConfigs;
  barchartConfigs?: ChartSeriesConfigs;
  description?: string;
  enableAreaChart?: boolean;
  enableBarChart?: boolean;
  fields: StatItem[];
  grow?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | true | false | null;
  index?: number;
  key: string;
  statKey?: string;
  barChartLensAttributes?: LensAttributes;
  areaChartLensAttributes?: LensAttributes;
}

export interface StatItemsProps extends StatItems {
  areaChart?: ChartSeriesData[];
  barChart?: ChartSeriesData[];
  from: string;
  id: string;
  updateDateRange: UpdateDateRange;
  to: string;
  loading: boolean;
  setQuerySkip: (skip: boolean) => void;
}
