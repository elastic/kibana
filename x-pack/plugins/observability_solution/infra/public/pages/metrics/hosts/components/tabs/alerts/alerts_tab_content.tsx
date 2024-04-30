/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { AlertConsumers, ALERT_RULE_PRODUCER } from '@kbn/rule-data-utils';
import { BrushEndListener, type XYBrushEvent } from '@elastic/charts';
import { useSummaryTimeRange } from '@kbn/observability-plugin/public';
import { useKibanaContextForPlugin } from '../../../../../../hooks/use_kibana';
import { HeightRetainer } from '../../../../../../components/height_retainer';
import { useUnifiedSearchContext } from '../../../hooks/use_unified_search';
import { useAlertsQuery } from '../../../hooks/use_alerts_query';
import { HostsState, HostsStateUpdater } from '../../../hooks/use_unified_search_url_state';
import { AlertsEsQuery } from '../../../../../../utils/filters/create_alerts_es_query';
import {
  ALERTS_PER_PAGE,
  ALERTS_TABLE_ID,
  infraAlertFeatureIds,
} from '../../../../../../components/shared/alerts/constants';
import AlertsStatusFilter from '../../../../../../components/shared/alerts/alerts_status_filter';
import { CreateAlertRuleButton } from '../../../../../../components/shared/alerts/links/create_alert_rule_button';
import { LinkToAlertsPage } from '../../../../../../components/shared/alerts/links/link_to_alerts_page';
import { INFRA_ALERT_FEATURE_ID } from '../../../../../../../common/constants';
import { AlertFlyout } from '../../../../../../alerting/inventory/components/alert_flyout';
import { useBoolean } from '../../../../../../hooks/use_boolean';
import { usePluginConfig } from '../../../../../../containers/plugin_config_context';

export const AlertsTabContent = () => {
  const { services } = useKibanaContextForPlugin();
  const { featureFlags } = usePluginConfig();

  const { alertStatus, setAlertStatus, alertsEsQueryByStatus } = useAlertsQuery();
  const [isAlertFlyoutVisible, { toggle: toggleAlertFlyout }] = useBoolean(false);

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
          <EuiFlexGroup alignItems="center" justifyContent="flexEnd" responsive={false}>
            {featureFlags.inventoryThresholdAlertRuleEnabled && (
              <EuiFlexItem grow={false}>
                <CreateAlertRuleButton
                  onClick={toggleAlertFlyout}
                  data-test-subj="infraHostAlertsTabCreateAlertsRuleButton"
                />
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <LinkToAlertsPage
                dateRange={searchCriteria.dateRange}
                data-test-subj="infraHostAlertsTabAlertsShowAllButton"
                kuery={`${ALERT_RULE_PRODUCER}: ${INFRA_ALERT_FEATURE_ID}`}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
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
      {featureFlags.inventoryThresholdAlertRuleEnabled && (
        <AlertFlyout
          nodeType="host"
          setVisible={toggleAlertFlyout}
          visible={isAlertFlyoutVisible}
        />
      )}
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
