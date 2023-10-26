/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo } from 'react';
import type { XYVisualOptions } from '@kbn/lens-embeddable-utils';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import { buildCombinedHostsFilter } from '../../../../../utils/filters/build';
import { type BrushEndArgs, LensChart, type OnFilterEvent } from '../../../../lens';
import { METRIC_CHART_HEIGHT } from '../../../constants';
import { useDateRangeProviderContext } from '../../../hooks/use_date_range';
import { extractRangeFromChartFilterEvent } from './chart_utils';
import type { XYConfig } from '../../../../../common/visualizations';

export interface ChartProps extends XYConfig {
  visualOptions?: XYVisualOptions;
  metricsDataView?: DataView;
  logsDataView?: DataView;
  filterFieldName: string;
  dateRange: TimeRange;
  assetName: string;
  ['data-test-subj']: string;
}

export const Chart = ({
  id,
  title,
  layers,
  metricsDataView,
  logsDataView,
  filterFieldName,
  visualOptions,
  dataViewOrigin,
  overrides,
  dateRange,
  assetName,
  ...props
}: ChartProps) => {
  const { setDateRange, refreshTs } = useDateRangeProviderContext();

  const dataView = useMemo(() => {
    return dataViewOrigin === 'metrics' ? metricsDataView : logsDataView;
  }, [dataViewOrigin, logsDataView, metricsDataView]);

  const filters = useMemo(() => {
    return [
      buildCombinedHostsFilter({
        field: filterFieldName,
        values: [assetName],
        dataView,
      }),
    ];
  }, [assetName, dataView, filterFieldName]);

  const handleBrushEnd = useCallback(
    ({ range, preventDefault }: BrushEndArgs) => {
      setDateRange({
        from: new Date(range[0]).toISOString(),
        to: new Date(range[1]).toISOString(),
      });

      preventDefault();
    },
    [setDateRange]
  );

  const handleFilter = useCallback(
    (event: OnFilterEvent) => {
      const range = extractRangeFromChartFilterEvent(event);

      if (range === null) {
        return;
      }

      setDateRange(range);
      event.preventDefault();
    },
    [setDateRange]
  );

  return (
    <LensChart
      id={`${props['data-test-subj']}${id}`}
      borderRadius="m"
      dataView={dataView}
      dateRange={dateRange}
      height={METRIC_CHART_HEIGHT}
      visualOptions={visualOptions}
      layers={layers}
      filters={filters}
      title={title}
      overrides={overrides}
      lastReloadRequestTime={refreshTs}
      visualizationType="lnsXY"
      onBrushEnd={handleBrushEnd}
      onFilter={handleFilter}
    />
  );
};
