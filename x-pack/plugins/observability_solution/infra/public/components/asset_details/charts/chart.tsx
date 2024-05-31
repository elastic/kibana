/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import type { LensConfig, LensDataviewDataset } from '@kbn/lens-embeddable-utils/config_builder';
import type { TimeRange } from '@kbn/es-query';
import useAsync from 'react-use/lib/useAsync';
import { resolveDataView } from '../../../utils/data_view';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { METRIC_CHART_HEIGHT } from '../../../common/visualizations/constants';
import { buildCombinedAssetFilter } from '../../../utils/filters/build';
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
  const {
    services: { dataViews },
  } = useKibanaContextForPlugin();

  const { value: filters = [] } = useAsync(async () => {
    const resolvedDataView = await resolveDataView({
      dataViewId: (props.dataset as LensDataviewDataset)?.index,
      dataViewsService: dataViews,
    });

    return [
      buildCombinedAssetFilter({
        field: queryField,
        values: [assetId],
        dataView: resolvedDataView.dataViewReference,
      }),
    ];
  }, [assetId, dataViews, props.dataset, queryField]);

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
      id={`infraAssetDetailsMetricChart${id}`}
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
