/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import { LensXYChart } from '../../../../lens';
import { buildCombinedHostsFilter } from '../../../../../utils/filters/build';
import { type Layer } from '../../../../../hooks/use_lens_attributes';
import type { FormulaConfig, XYLayerOptions } from '../../../../../common/visualizations';

const HEIGHT = 250;
export interface MetricChartProps extends Pick<TypedLensByValueInput, 'id' | 'overrides'> {
  title: string;
  layers: Array<Layer<XYLayerOptions, FormulaConfig[]>>;
  dataView?: DataView;
  timeRange: TimeRange;
  nodeName: string;
}

export const MetricChart = ({
  id,
  title,
  layers,
  nodeName,
  timeRange,
  dataView,
  overrides,
}: MetricChartProps) => {
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
    <LensXYChart
      id={`infraAssetDetailsMetricsChart${id}`}
      dataView={dataView}
      dateRange={timeRange}
      height={HEIGHT}
      layers={layers}
      filters={filters}
      title={title}
      overrides={overrides}
      disableTriggers
    />
  );
};
