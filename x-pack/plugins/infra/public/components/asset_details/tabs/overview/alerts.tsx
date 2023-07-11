/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useState } from 'react';
import {
  calculateTimeRangeBucketSize,
  getAlertSummaryTimeRange,
  useTimeBuckets,
} from '@kbn/observability-plugin/public';
import { TimeRange } from '@kbn/es-query';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { InventoryItemType } from '../../../../../common/inventory_models/types';
import { findInventoryFields } from '../../../../../common/inventory_models';
import { createAlertsEsQuery } from '../../../../common/alerts/create_alerts_es_query';
import type { AlertStatus } from '../../../../pages/metrics/hosts/types';
import {
  DEFAULT_DATE_FORMAT,
  DEFAULT_INTERVAL,
  infraAlertFeatureIds,
} from '../../../../pages/metrics/hosts/components/tabs/config';
import type { HostsState } from '../../../../pages/metrics/hosts/hooks/use_unified_search_url_state';
import type { AlertsEsQuery } from '../../../../pages/metrics/hosts/hooks/use_alerts_query';
import type { StringDateRange } from '../../types';

import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { LinkToAlertsRule } from '../../links/link_to_alerts';
import { LinkToAlertsPage } from '../../links/link_to_alerts_page';
import { AlertFlyout } from '../../../../alerting/inventory/components/alert_flyout';

const ALERT_STATUS: AlertStatus = 'all';

export const AlertsSummaryContent = ({
  nodeName,
  nodeType,
  dateRange,
}: {
  nodeName: string;
  nodeType: InventoryItemType;
  dateRange: StringDateRange;
}) => {
  const [isAlertFlyoutVisible, setAlertFlyoutVisible] = useState(false);

  const alertsEsQueryByStatus = useMemo(
    () =>
      createAlertsEsQuery({
        dateRange,
        hostNodeNames: [nodeName],
        status: ALERT_STATUS,
      }),
    [nodeName, dateRange]
  );

  return (
    <>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem>
          <EuiText style={{ fontWeight: 700, textTransform: 'uppercase' }} size="s">
            <FormattedMessage
              id="xpack.infra.assetDetails.overview.alertsSectionTitle"
              defaultMessage="Alerts"
            />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <LinkToAlertsRule onClick={() => setAlertFlyoutVisible(true)} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <LinkToAlertsPage
            nodeName={nodeName}
            queryField={`${nodeType}.name`}
            dateRange={dateRange}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <MemoAlertSummaryWidget alertsQuery={alertsEsQueryByStatus} dateRange={dateRange} />
      <AlertFlyout
        filter={`${findInventoryFields(nodeType).name}: "${nodeName}"`}
        nodeType={nodeType}
        setVisible={setAlertFlyoutVisible}
        visible={isAlertFlyoutVisible}
      />
    </>
  );
};

interface MemoAlertSummaryWidgetProps {
  alertsQuery: AlertsEsQuery;
  dateRange: HostsState['dateRange'];
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
      <>
        <AlertSummaryWidget
          chartProps={chartProps}
          featureIds={infraAlertFeatureIds}
          filter={alertsQuery}
          timeRange={summaryTimeRange}
          fullSize
          hideChart
        />
      </>
    );
  }
);

const useSummaryTimeRange = (unifiedSearchDateRange: TimeRange) => {
  const timeBuckets = useTimeBuckets();

  const bucketSize = useMemo(
    () => calculateTimeRangeBucketSize(unifiedSearchDateRange, timeBuckets),
    [unifiedSearchDateRange, timeBuckets]
  );

  return getAlertSummaryTimeRange(
    unifiedSearchDateRange,
    bucketSize?.intervalString || DEFAULT_INTERVAL,
    bucketSize?.dateFormat || DEFAULT_DATE_FORMAT
  );
};
