/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';
import { TimeRange } from '@kbn/es-query';
import { LensMetricChart } from '../../../../lens';
import type { KPIChartProps } from '../../../../../common/visualizations/lens/dashboards/host/kpi_grid_config';
import { buildCombinedHostsFilter } from '../../../../../utils/filters/build';

export interface TileProps {
  timeRange: TimeRange;
  dataView?: DataView;
  nodeName: string;
}

const AVERAGE_SUBTITLE = i18n.translate(
  'xpack.infra.assetDetailsEmbeddable.overview.metricTrend.subtitle.average',
  {
    defaultMessage: 'Average',
  }
);

export const Tile = ({
  id,
  layers,
  title,
  toolTip,
  dataView,
  nodeName,
  timeRange,
}: KPIChartProps & TileProps) => {
  const filters = useMemo(() => {
    return [
      buildCombinedHostsFilter({
        field: 'host.name',
        values: [nodeName],
        dataView,
      }),
    ];
  }, [dataView, nodeName]);

  return (
    <LensMetricChart
      id={`infraAssetDetailsKPI${id}`}
      dataView={dataView}
      dateRange={timeRange}
      layers={{ ...layers, options: { ...layers.options, subtitle: AVERAGE_SUBTITLE } }}
      filters={filters}
      title={title}
      toolTip={toolTip}
      disableTriggers
    />
  );
};
