/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';

import type { DataView } from '@kbn/data-views-plugin/public';
import { TimeRange } from '@kbn/es-query';
import { LensChart, TooltipContent } from '../../../../lens';
import { AVERAGE_SUBTITLE, type KPIChartProps } from '../../../../../common/visualizations';
import { buildCombinedHostsFilter } from '../../../../../utils/filters/build';

import { useDateRangeProviderContext } from '../../../hooks/use_date_range';

export const Kpi = ({
  id,
  title,
  layers,
  toolTip,
  height,
  dataView,
  assetName,
  dateRange,
}: KPIChartProps & {
  height: number;
  dataView?: DataView;
  assetName: string;
  dateRange: TimeRange;
}) => {
  const { refreshTs } = useDateRangeProviderContext();
  const filters = useMemo(() => {
    return [
      buildCombinedHostsFilter({
        field: 'host.name',
        values: [assetName],
        dataView,
      }),
    ];
  }, [dataView, assetName]);

  const tooltipContent = useMemo(() => <TooltipContent description={toolTip} />, [toolTip]);

  return (
    <LensChart
      id={`infraAssetDetailsKPI${id}`}
      dataView={dataView}
      dateRange={dateRange}
      layers={layers}
      lastReloadRequestTime={refreshTs}
      height={height}
      filters={filters}
      title={title}
      subtitle={AVERAGE_SUBTITLE}
      toolTip={tooltipContent}
      visualizationType="lnsMetric"
      disableTriggers
      hidePanelTitles
    />
  );
};
