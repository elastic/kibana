/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import { EuiFlexGrid, EuiFlexItem, EuiTitle, EuiSpacer, EuiFlexGroup } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import { FormattedMessage } from '@kbn/i18n-react';
import { buildCombinedHostsFilter } from '../../../../../utils/filters/build';
import { HostMetricsDocsLink, LensChart } from '../../../../lens';
import { CHARTS_IN_ORDER, type DataViewOrigin } from './dashboard_config';

const HEIGHT = 250;

export interface MetricsGridProps {
  nodeName: string;
  timeRange: TimeRange;
  metricsDataView?: DataView;
  logsDataView?: DataView;
}

export const MetricsGrid = React.memo(
  ({ nodeName, metricsDataView, logsDataView, timeRange }: MetricsGridProps) => {
    const getDataView = useCallback(
      (dataViewOrigin: DataViewOrigin) => {
        return dataViewOrigin === 'metrics' ? metricsDataView : logsDataView;
      },
      [logsDataView, metricsDataView]
    );

    const getFilters = useCallback(
      (dataViewOrigin: DataViewOrigin) => {
        return [
          buildCombinedHostsFilter({
            field: 'host.name',
            values: [nodeName],
            dataView: getDataView(dataViewOrigin),
          }),
        ];
      },
      [getDataView, nodeName]
    );

    return (
      <EuiFlexGroup gutterSize="m" direction="column">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h5>
              <FormattedMessage
                id="xpack.infra.assetDetails.overview.metricsSectionTitle"
                defaultMessage="Metrics"
              />
            </h5>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <HostMetricsDocsLink />
          <EuiSpacer size="s" />
          <EuiFlexGrid columns={2} gutterSize="s" data-test-subj="assetDetailsMetricsChartGrid">
            {CHARTS_IN_ORDER.map(({ dataViewOrigin, id, layers, title, overrides }, index) => (
              <EuiFlexItem key={index} grow={false}>
                <LensChart
                  id={`infraAssetDetailsMetricsChart${id}`}
                  borderRadius="m"
                  dataView={getDataView(dataViewOrigin)}
                  dateRange={timeRange}
                  height={HEIGHT}
                  layers={layers}
                  filters={getFilters(dataViewOrigin)}
                  title={title}
                  overrides={overrides}
                  visualizationType="lnsXY"
                  disableTriggers
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGrid>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
