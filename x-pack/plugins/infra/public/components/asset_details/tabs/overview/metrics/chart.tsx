/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo } from 'react';
import type { ChartModel } from '@kbn/lens-embeddable-utils';
import type { TimeRange } from '@kbn/es-query';
import { METRIC_CHART_HEIGHT } from '../../../../../common/visualizations/constants';
import { buildCombinedHostsFilter } from '../../../../../utils/filters/build';
import { type BrushEndArgs, LensChart, type OnFilterEvent, LensChartProps } from '../../../../lens';
import { useDatePickerContext } from '../../../hooks/use_date_picker';
import { extractRangeFromChartFilterEvent } from './chart_utils';
import { useLoadingStateContext } from '../../../hooks/use_loading_state';

export type ChartProps = ChartModel &
  Pick<LensChartProps, 'overrides'> & {
    filterFieldName: string;
    dateRange: TimeRange;
    assetName: string;
    dataViewOrigin?: 'metrics' | 'logs';
    ['data-test-subj']: string;
  };

export const Chart = ({
  id,
  filterFieldName,
  dataViewOrigin,
  overrides,
  dateRange,
  assetName,
  dataView,
  ...props
}: ChartProps) => {
  const { setDateRange } = useDatePickerContext();
  const { searchSessionId } = useLoadingStateContext();
  const { ['data-test-subj']: dataTestSubj, ...chartProps } = { ...props };

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
      {...chartProps}
      id={`${dataTestSubj}${id}`}
      borderRadius="m"
      dataView={dataView}
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
