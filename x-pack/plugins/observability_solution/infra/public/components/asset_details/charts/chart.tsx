/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo } from 'react';

import type { LensConfig, LensDataviewDataset } from '@kbn/lens-embeddable-utils/config_builder';
import type { TimeRange } from '@kbn/es-query';
import { useDataView } from '../../../hooks/use_data_view';
import { METRIC_CHART_HEIGHT } from '../../../common/visualizations/constants';
import { buildCombinedHostsFilter } from '../../../utils/filters/build';
import { type BrushEndArgs, LensChart, type OnFilterEvent, LensChartProps } from '../../lens';
import { useDatePickerContext } from '../hooks/use_date_picker';
import { extractRangeFromChartFilterEvent } from './chart_utils';
import { useLoadingStateContext } from '../hooks/use_loading_state';

export type ChartProps = LensConfig &
  Pick<LensChartProps, 'overrides'> & {
    id: string;
    queryField: string;
    dateRange: TimeRange;
    assetId: string;
  };

export const Chart = ({ id, queryField, overrides, dateRange, assetId, ...props }: ChartProps) => {
  const { setDateRange } = useDatePickerContext();
  const { searchSessionId } = useLoadingStateContext();
  const { dataView } = useDataView({ index: (props.dataset as LensDataviewDataset)?.index });

  const filters = useMemo(() => {
    return [
      buildCombinedHostsFilter({
        field: queryField,
        values: [assetId],
        dataView,
      }),
    ];
  }, [assetId, dataView, queryField]);

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
      {...props}
      id={`infraAssetDetailsHostMetricsChart${id}`}
      borderRadius="m"
      dateRange={dateRange}
      height={METRIC_CHART_HEIGHT}
      searchSessionId={searchSessionId}
      filters={filters}
      overrides={overrides}
      onBrushEnd={handleBrushEnd}
      onFilter={handleFilter}
    />
  );
};
