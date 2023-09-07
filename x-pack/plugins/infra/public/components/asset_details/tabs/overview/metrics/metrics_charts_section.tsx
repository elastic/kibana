/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo } from 'react';

import { EuiFlexGrid, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import { LensEmbeddableInput } from '@kbn/lens-plugin/public';
import type { XYConfig } from '../../../../../common/visualizations/lens/dashboards/asset_details/metric_charts/types';
import { XY_MISSING_VALUE_DOTTED_LINE_CONFIG } from '../../../../../common/visualizations';
import { buildCombinedHostsFilter } from '../../../../../utils/filters/build';
import { LensChart } from '../../../../lens';
import { METRIC_CHART_HEIGHT } from '../../../constants';
import type { DataViewOrigin } from '../../../types';
import { useDateRangeProviderContext } from '../../../hooks/use_date_range';
import { useMetadataStateProviderContext } from '../../../hooks/use_metadata_state';

type BrushEndArgs = Parameters<NonNullable<LensEmbeddableInput['onBrushEnd']>>[0];

interface ChartGridProps {
  assetName: string;
  timeRange: TimeRange;
  metricsDataView?: DataView;
  logsDataView?: DataView;
  charts: Array<XYConfig & { dependsOn?: string[] }>;
  ['data-test-subj']: string;
}

export const ChartGrid = React.memo(
  ({ assetName, metricsDataView, logsDataView, timeRange, charts, ...props }: ChartGridProps) => {
    const { setDateRange } = useDateRangeProviderContext();
    const getDataView = useCallback(
      (dataViewOrigin: DataViewOrigin) => {
        return dataViewOrigin === 'metrics' ? metricsDataView : logsDataView;
      },
      [logsDataView, metricsDataView]
    );
    const { metadata } = useMetadataStateProviderContext();

    const getFilters = useCallback(
      (dataViewOrigin: DataViewOrigin) => {
        return [
          buildCombinedHostsFilter({
            field: 'host.name',
            values: [assetName],
            dataView: getDataView(dataViewOrigin),
          }),
        ];
      },
      [getDataView, assetName]
    );

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

    const chartsToRender = useMemo(
      () =>
        charts.filter(
          (c) =>
            !c.dependsOn ||
            c.dependsOn.every((d) => (metadata?.features ?? []).some((f) => d === f.name))
        ),
      [charts, metadata?.features]
    );

    return (
      <EuiFlexGrid columns={2} gutterSize="s" data-test-subj={`${props['data-test-subj']}Grid`}>
        {chartsToRender.map(({ dataViewOrigin, id, layers, title, overrides }, index) => (
          <EuiFlexItem key={index} grow={false}>
            <LensChart
              id={`${props['data-test-subj']}${id}`}
              borderRadius="m"
              dataView={getDataView(dataViewOrigin)}
              dateRange={timeRange}
              height={METRIC_CHART_HEIGHT}
              visualOptions={XY_MISSING_VALUE_DOTTED_LINE_CONFIG}
              layers={layers}
              filters={getFilters(dataViewOrigin)}
              title={title}
              overrides={overrides}
              visualizationType="lnsXY"
              onBrushEnd={handleBrushEnd}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
    );
  }
);

export const Section = ({
  title,
  dependsOn = [],
  children,
}: {
  title: React.FunctionComponent;
  dependsOn?: string[];
  children: React.ReactNode;
}) => {
  const Title = title;
  const { metadata } = useMetadataStateProviderContext();

  const shouldRender = useMemo(
    () =>
      dependsOn.length === 0 ||
      dependsOn.some((p) => (metadata?.features ?? []).some((f) => f.name === p)),
    [dependsOn, metadata?.features]
  );

  return shouldRender ? (
    <EuiFlexGroup gutterSize="m" direction="column">
      <EuiFlexItem grow={false}>
        <Title />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{children}</EuiFlexItem>
    </EuiFlexGroup>
  ) : null;
};
