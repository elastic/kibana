/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { BrushEndListener, type XYBrushEvent } from '@elastic/charts';
import { useSummaryTimeRange } from '@kbn/observability-plugin/public';
import type { AlertsEsQuery } from '../../../../../../common/alerts/types';
import { useKibanaContextForPlugin } from '../../../../../../hooks/use_kibana';
import { HeightRetainer } from '../../../../../../components/height_retainer';
import { useUnifiedSearchContext } from '../../../hooks/use_unified_search';
import { useAlertsQuery } from '../../../hooks/use_alerts_query';
import AlertsStatusFilter from './alerts_status_filter';
import { ALERTS_PER_PAGE, ALERTS_TABLE_ID, infraAlertFeatureIds } from '../config';
import { HostsState, HostsStateUpdater } from '../../../hooks/use_unified_search_url_state';

export const AlertsTabContent = () => {
  const { services } = useKibanaContextForPlugin();

  const { alertStatus, setAlertStatus, alertsEsQueryByStatus } = useAlertsQuery();

  const { onSubmit, searchCriteria } = useUnifiedSearchContext();

  const { triggersActionsUi } = services;

  const { alertsTableConfigurationRegistry, getAlertsStateTable: AlertsStateTable } =
    triggersActionsUi;

  return (
    <HeightRetainer>
      <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="hostsView-alerts">
        <EuiFlexGroup justifyContent="flexStart" alignItems="center">
          <EuiFlexItem grow={false}>
            <AlertsStatusFilter onChange={setAlertStatus} status={alertStatus} />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexItem>
          <MemoAlertSummaryWidget
            alertsQuery={alertsEsQueryByStatus}
            dateRange={searchCriteria.dateRange}
            onRangeSelection={onSubmit}
          />
        </EuiFlexItem>
        {alertsEsQueryByStatus && (
          <EuiFlexItem>
            <AlertsStateTable
              alertsTableConfigurationRegistry={alertsTableConfigurationRegistry}
              configurationId={AlertConsumers.OBSERVABILITY}
              featureIds={infraAlertFeatureIds}
              id={ALERTS_TABLE_ID}
              pageSize={ALERTS_PER_PAGE}
              query={alertsEsQueryByStatus}
              showAlertStatusWithFlapping
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </HeightRetainer>
  );
};

interface MemoAlertSummaryWidgetProps {
  alertsQuery: AlertsEsQuery;
  dateRange: HostsState['dateRange'];
  onRangeSelection: HostsStateUpdater;
}

const MemoAlertSummaryWidget = React.memo(
  ({ alertsQuery, dateRange, onRangeSelection }: MemoAlertSummaryWidgetProps) => {
    const { services } = useKibanaContextForPlugin();

    const summaryTimeRange = useSummaryTimeRange(dateRange);

    const { charts, triggersActionsUi } = services;
    const { getAlertSummaryWidget: AlertSummaryWidget } = triggersActionsUi;

    const onBrushEnd: BrushEndListener = (brushEvent) => {
      const { x } = brushEvent as XYBrushEvent;
      if (x) {
        const [start, end] = x;

        const from = new Date(start).toISOString();
        const to = new Date(end).toISOString();

        onRangeSelection({ dateRange: { from, to } });
      }
    };

    const chartProps = {
      theme: charts.theme.useChartsTheme(),
      baseTheme: charts.theme.useChartsBaseTheme(),
      onBrushEnd,
    };

    return (
      <AlertSummaryWidget
        chartProps={chartProps}
        featureIds={infraAlertFeatureIds}
        filter={alertsQuery}
        fullSize
        timeRange={summaryTimeRange}
      />
    );
  }
);
