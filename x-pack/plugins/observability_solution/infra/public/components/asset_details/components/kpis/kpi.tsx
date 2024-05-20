/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import type { LensConfig } from '@kbn/lens-embeddable-utils/config_builder';
import { METRICS_TOOLTIP, KPI_CHART_HEIGHT } from '../../../../common/visualizations';
import { LensChart, TooltipContent } from '../../../lens';

export const Kpi = ({
  id,
  dateRange,
  query,
  filters,
  searchSessionId,
  loading,
  ...chartProps
}: LensConfig & {
  id: string;
  dateRange: TimeRange;
  query?: Query;
  filters?: Filter[];
  searchSessionId?: string;
  loading?: boolean;
}) => {
  const tooltipContent = useMemo(
    () =>
      id in METRICS_TOOLTIP ? (
        <TooltipContent description={METRICS_TOOLTIP[id as keyof typeof METRICS_TOOLTIP]} />
      ) : undefined,
    [id]
  );

  return (
    <LensChart
      {...chartProps}
      id={`infraAssetDetailsKPI${id}`}
      dateRange={dateRange}
      height={KPI_CHART_HEIGHT}
      filters={filters}
      query={query}
      loading={loading}
      toolTip={tooltipContent}
      searchSessionId={searchSessionId}
      disableTriggers
      hidePanelTitles
    />
  );
};
