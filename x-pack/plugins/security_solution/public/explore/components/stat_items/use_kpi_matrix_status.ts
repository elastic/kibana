/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  HostsKpiStrategyResponse,
  NetworkKpiStrategyResponse,
  UserskKpiStrategyResponse,
} from '../../../../common/search_strategy';
import type { UpdateDateRange } from '../../../common/components/charts/common';
import type { StatItems, StatItemsProps } from './types';
import { addValueToAreaChart, addValueToBarChart, addValueToFields } from './utils';

export const useKpiMatrixStatus = (
  mappings: Readonly<StatItems[]>,
  data: HostsKpiStrategyResponse | NetworkKpiStrategyResponse | UserskKpiStrategyResponse,
  id: string,
  from: string,
  to: string,
  updateDateRange: UpdateDateRange,
  setQuerySkip: (skip: boolean) => void,
  loading: boolean
): StatItemsProps[] =>
  mappings.map((stat) => ({
    ...stat,
    areaChart: stat.enableAreaChart ? addValueToAreaChart(stat.fields, data) : undefined,
    barChart: stat.enableBarChart ? addValueToBarChart(stat.fields, data) : undefined,
    fields: addValueToFields(stat.fields, data),
    id,
    key: `kpi-summary-${stat.key}`,
    statKey: `${stat.key}`,
    from,
    to,
    updateDateRange,
    setQuerySkip,
    loading,
  }));
