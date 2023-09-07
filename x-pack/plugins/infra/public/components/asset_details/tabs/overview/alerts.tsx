/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { useSummaryTimeRange } from '@kbn/observability-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import type { AlertsEsQuery } from '../../../../common/alerts/types';
import type { InventoryItemType } from '../../../../../common/inventory_models/types';
import { findInventoryFields } from '../../../../../common/inventory_models';
import { createAlertsEsQuery } from '../../../../common/alerts/create_alerts_es_query';
import { infraAlertFeatureIds } from '../../../../pages/metrics/hosts/components/tabs/config';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { LinkToAlertsRule } from '../../links/link_to_alerts';
import { LinkToAlertsPage } from '../../links/link_to_alerts_page';
import { AlertFlyout } from '../../../../alerting/inventory/components/alert_flyout';
import { useBoolean } from '../../../../hooks/use_boolean';
import { ALERT_STATUS_ALL } from '../../../../common/alerts/constants';
import { AlertsSectionTitle } from '../../components/section_titles';

export const AlertsSummaryContent = ({
  assetName,
  assetType,
  dateRange,
}: {
  assetName: string;
  assetType: InventoryItemType;
  dateRange: TimeRange;
}) => {
  const [isAlertFlyoutVisible, { toggle: toggleAlertFlyout }] = useBoolean(false);

  const alertsEsQueryByStatus = useMemo(
    () =>
      createAlertsEsQuery({
        dateRange,
        hostNodeNames: [assetName],
        status: ALERT_STATUS_ALL,
      }),
    [assetName, dateRange]
  );

  return (
    <>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem>
          <AlertsSectionTitle />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <LinkToAlertsRule onClick={toggleAlertFlyout} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <LinkToAlertsPage
            assetName={assetName}
            queryField={`${assetType}.name`}
            dateRange={dateRange}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <MemoAlertSummaryWidget alertsQuery={alertsEsQueryByStatus} dateRange={dateRange} />
      <AlertFlyout
        filter={`${findInventoryFields(assetType).name}: "${assetName}"`}
        nodeType={assetType}
        setVisible={toggleAlertFlyout}
        visible={isAlertFlyoutVisible}
      />
    </>
  );
};

interface MemoAlertSummaryWidgetProps {
  alertsQuery: AlertsEsQuery;
  dateRange: TimeRange;
}

const MemoAlertSummaryWidget = React.memo(
  ({ alertsQuery, dateRange }: MemoAlertSummaryWidgetProps) => {
    const { services } = useKibanaContextForPlugin();

    const summaryTimeRange = useSummaryTimeRange(dateRange);

    const { charts, triggersActionsUi } = services;
    const { getAlertSummaryWidget: AlertSummaryWidget } = triggersActionsUi;

    const chartProps = {
      theme: charts.theme.useChartsTheme(),
      baseTheme: charts.theme.useChartsBaseTheme(),
    };

    return (
      <AlertSummaryWidget
        chartProps={chartProps}
        featureIds={infraAlertFeatureIds}
        filter={alertsQuery}
        timeRange={summaryTimeRange}
        fullSize
        hideChart
      />
    );
  }
);
