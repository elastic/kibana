/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { TimeRange } from '@kbn/es-query';
import { useSummaryTimeRange } from '@kbn/observability-plugin/public';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { AlertsCount } from '../../../hooks/use_alerts_count';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { AlertsEsQuery } from '../../../utils/filters/create_alerts_es_query';
import { infraAlertFeatureIds } from './constants';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { BrushEndListener, XYBrushEvent } from '@elastic/charts';
import { HostsStateUpdater } from '../../../pages/metrics/hosts/hooks/use_unified_search_url_state';
import { useAlertsQuery } from '../../../pages/metrics/hosts/hooks/use_alerts_query';
import AlertsStatusFilter from '../../../pages/metrics/hosts/components/tabs/alerts/alerts_status_filter';

interface AlertsOverviewProps {
  alertsQuery: AlertsEsQuery;
  dateRange: TimeRange;
  onLoaded: (alertsCount?: AlertsCount) => void;
  onRangeSelection?: HostsStateUpdater;
}

export const AlertsOverview = React.memo(
  ({ alertsQuery, dateRange, onLoaded, onRangeSelection }: AlertsOverviewProps) => {
    const { services } = useKibanaContextForPlugin();
    const { alertStatus, setAlertStatus, alertsEsQueryByStatus } = useAlertsQuery();

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
            filter={alertsQuery}
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
              query={alertsQuery}
              pageSize={5}
            />
          </EuiFlexItem>
        }
      </EuiFlexGroup>
    );
  }
);
