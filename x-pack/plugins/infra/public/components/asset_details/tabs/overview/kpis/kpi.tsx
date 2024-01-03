/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';

import type { DataView } from '@kbn/data-views-plugin/public';
import { TimeRange } from '@kbn/es-query';
import { LensConfig } from '@kbn/lens-embeddable-utils/config_builder';
import { METRICS_TOOLTIP } from '../../../../../common/visualizations';
import { LensChart, TooltipContent } from '../../../../lens';
import { buildCombinedHostsFilter } from '../../../../../utils/filters/build';
import { useLoadingStateContext } from '../../../hooks/use_loading_state';

export const Kpi = ({
  height,
  assetName,
  dateRange,
  dataView,
  ...chartProps
}: LensConfig & {
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

  const tooltipContent = useMemo(
    () => <TooltipContent description={METRICS_TOOLTIP.cpuUsage} />,
    []
  );

  return (
    <LensChart
      {...chartProps}
      id={`infraAssetDetailsKPI1`}
      dataView={dataView}
      dateRange={dateRange}
      height={height}
      filters={filters}
      toolTip={tooltipContent}
      searchSessionId={searchSessionId}
      disableTriggers
      hidePanelTitles
    />
  );
};
