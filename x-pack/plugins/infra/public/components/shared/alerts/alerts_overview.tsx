/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useState } from 'react';
import type { AlertStatus } from '@kbn/observability-plugin/common/typings';
import type { TimeRange } from '@kbn/es-query';
import { useSummaryTimeRange } from '@kbn/observability-plugin/public';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { AlertsCount } from '../../../hooks/use_alerts_count';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { createAlertsEsQuery } from '../../../utils/filters/create_alerts_es_query';
import { ALERT_STATUS_ALL, infraAlertFeatureIds } from './constants';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { BrushEndListener, XYBrushEvent } from '@elastic/charts';
import { HostsStateUpdater } from '../../../pages/metrics/hosts/hooks/use_unified_search_url_state';
import AlertsStatusFilter from './alerts_status_filter';

interface AlertsOverviewProps {
  assetName: string;
  dateRange: TimeRange;
  onLoaded: (alertsCount?: AlertsCount) => void;
  onRangeSelection?: HostsStateUpdater;
}

export const AlertsOverview = React.memo(
  ({ assetName, dateRange, onLoaded, onRangeSelection }: AlertsOverviewProps) => {
    const { services } = useKibanaContextForPlugin();
    const [alertStatus, setAlertStatus] = useState<AlertStatus>(ALERT_STATUS_ALL);
    console.log('asset');
    const alertsEsQueryByStatus = useMemo(
      () =>
        createAlertsEsQuery({
          dateRange,
          hostNodeNames: [assetName],
          status: alertStatus,
        }),
      [assetName, dateRange, alertStatus]
    );

    const alertsEsQuery = useMemo(
      () =>
        createAlertsEsQuery({
          dateRange,
          hostNodeNames: [assetName],
          status: ALERT_STATUS_ALL,
        }),
      [assetName, dateRange]
    );

    const summaryTimeRange = useSummaryTimeRange(dateRange);

    const {
      charts,
      triggersActionsUi: {
        getAlertsStateTable: AlertsStateTable,
        alertsTableConfigurationRegistry,
        getAlertSummaryWidget: AlertSummaryWidget,
      },
    } = services;

    const onBrushEnd: BrushEndListener = (brushEvent) => {
      const { x } = brushEvent as XYBrushEvent;
      if (x && onRangeSelection) {
        const [start, end] = x;

        const from = new Date(start).toISOString();
        const to = new Date(end).toISOString();

        onRangeSelection({ dateRange: { from, to } });
      }
    };

    const chartProps = {
      baseTheme: charts.theme.useChartsBaseTheme(),
      onBrushEnd,
    };

    return (
      <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="hostsView-alerts">
        <EuiFlexGroup justifyContent="flexStart" alignItems="center">
          <EuiFlexItem grow={false}>
            <AlertsStatusFilter onChange={setAlertStatus} status={alertStatus} />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexItem>
          <AlertSummaryWidget
            chartProps={chartProps}
            featureIds={infraAlertFeatureIds}
            filter={alertsEsQuery}
            timeRange={summaryTimeRange}
            onLoaded={onLoaded}
            fullSize
          />
        </EuiFlexItem>
        {
          <EuiFlexItem>
            <AlertsStateTable
              alertsTableConfigurationRegistry={alertsTableConfigurationRegistry}
              id={'assetDetailsAlertsTable'}
              configurationId={AlertConsumers.OBSERVABILITY}
              featureIds={[...infraAlertFeatureIds, AlertConsumers.OBSERVABILITY]}
              showAlertStatusWithFlapping
              query={alertsEsQueryByStatus}
              pageSize={5}
            />
          </EuiFlexItem>
        }
      </EuiFlexGroup>
    );
  }
);
