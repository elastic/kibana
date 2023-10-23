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
import { useLoadingStateContext } from '../../../hooks/use_loading_observable';

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
  const { searchSessionId } = useLoadingStateContext();
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
      height={height}
      filters={filters}
      title={title}
      subtitle={AVERAGE_SUBTITLE}
      toolTip={tooltipContent}
      visualizationType="lnsMetric"
      searchSessionId={searchSessionId}
      disableTriggers
      hidePanelTitles
    />
  );
};
