/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';

import type { DataView } from '@kbn/data-views-plugin/public';
import { TimeRange } from '@kbn/es-query';
import type { LensConfig } from '@kbn/lens-embeddable-utils/config_builder';
import useAsync from 'react-use/lib/useAsync';
import { METRICS_TOOLTIP } from '../../../../../common/visualizations';
import { LensChart, TooltipContent } from '../../../../lens';
import { buildCombinedHostsFilter } from '../../../../../utils/filters/build';
import { useKibanaContextForPlugin } from '../../../../../hooks/use_kibana';
import { useLoadingStateContext } from '../../../hooks/use_loading_state';

export const Kpi = ({
  id,
  height,
  assetName,
  dateRange,
  ...chartProps
}: LensConfig & {
  id: string;
  height: number;
  dataView?: DataView;
  assetName: string;
  dateRange: TimeRange;
}) => {
  const {
    services: { dataViews },
  } = useKibanaContextForPlugin();
  const { searchSessionId } = useLoadingStateContext();

  const { value: dataView } = useAsync(async () => {
    if (!chartProps.dataset) {
      return undefined;
    }
    if ('index' in chartProps.dataset) {
      return dataViews.get(chartProps.dataset.index, false);
    }
  }, [chartProps.dataset]);

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
      height={height}
      filters={filters}
      toolTip={tooltipContent}
      searchSessionId={searchSessionId}
      disableTriggers
      hidePanelTitles
    />
  );
};
