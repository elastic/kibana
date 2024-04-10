/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonText,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useTheme } from '@kbn/observability-shared-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useSelector } from 'react-redux';
import { RECORDS_FIELD } from '@kbn/exploratory-view-plugin/public';
import { selectOverviewStatus } from '../../../../state/overview_status';
import { AlertsLink } from '../../../common/links/view_alerts';
import { useRefreshedRange, useGetUrlParams } from '../../../../hooks';
import { ClientPluginsStart } from '../../../../../../plugin';

export const useMonitorQueryIds = () => {
  const { status } = useSelector(selectOverviewStatus);

  const { statusFilter } = useGetUrlParams();
  return useMemo(() => {
    let monitorIds = status?.enabledMonitorQueryIds ?? [];
    switch (statusFilter) {
      case 'up':
        monitorIds = status
          ? Object.entries(status.upConfigs).map(([id, config]) => config.monitorQueryId)
          : [];
        break;
      case 'down':
        monitorIds = status
          ? Object.entries(status.downConfigs).map(([id, config]) => config.monitorQueryId)
          : [];
        break;
      case 'disabled':
        monitorIds = status?.disabledMonitorQueryIds ?? [];
        break;
      case 'pending':
        monitorIds = status
          ? Object.entries(status.pendingConfigs).map(([id, config]) => config.monitorQueryId)
          : [];
        break;
      default:
        break;
    }
    return monitorIds.length > 0 ? monitorIds : ['false-id'];
  }, [status, statusFilter]);
};

export const OverviewAlerts = () => {
  const { from, to } = useRefreshedRange(12, 'hours');

  const {
    exploratoryView: { ExploratoryViewEmbeddable },
  } = useKibana<ClientPluginsStart>().services;

  const theme = useTheme();

  const { status } = useSelector(selectOverviewStatus);

  const { locations } = useGetUrlParams();

  const loading = !status?.allIds || status?.allIds.length === 0;

  const monitorIds = useMonitorQueryIds();

  return (
    <EuiPanel hasShadow={false} paddingSize="m" hasBorder>
      <EuiTitle size="xs">
        <h3>{headingText}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      {loading ? (
        <EuiSkeletonText lines={3} />
      ) : (
        <EuiFlexGroup alignItems="center" gutterSize="m">
          <EuiFlexItem grow={false}>
            <ExploratoryViewEmbeddable
              id="monitorActiveAlertsCount"
              dataTestSubj="monitorActiveAlertsCount"
              reportType="single-metric"
              customHeight="70px"
              attributes={[
                {
                  dataType: 'alerts',
                  time: {
                    from,
                    to,
                  },
                  name: ALERTS_LABEL,
                  selectedMetricField: RECORDS_FIELD,
                  reportDefinitions: {
                    'kibana.alert.rule.category': ['Synthetics monitor status'],
                    'monitor.id': monitorIds,
                    ...(locations?.length ? { 'observer.geo.name': locations } : {}),
                  },
                  filters: [{ field: 'kibana.alert.status', values: ['active', 'recovered'] }],
                  color: theme.eui.euiColorVis1,
                },
              ]}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <ExploratoryViewEmbeddable
              id="monitorActiveAlertsOverTime"
              sparklineMode
              customHeight="70px"
              reportType="kpi-over-time"
              attributes={[
                {
                  seriesType: 'area',
                  time: {
                    from,
                    to,
                  },
                  reportDefinitions: {
                    'kibana.alert.rule.category': ['Synthetics monitor status'],
                    'monitor.id': monitorIds,
                    ...(locations?.length ? { 'observer.geo.name': locations } : {}),
                  },
                  dataType: 'alerts',
                  selectedMetricField: RECORDS_FIELD,
                  name: ALERTS_LABEL,
                  filters: [{ field: 'kibana.alert.status', values: ['active', 'recovered'] }],
                  color: theme.eui.euiColorVis1_behindText,
                },
              ]}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false} css={{ alignSelf: 'center' }}>
            <AlertsLink />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </EuiPanel>
  );
};

const ALERTS_LABEL = i18n.translate('xpack.synthetics.detailsPanel.alerts', {
  defaultMessage: 'Alerts',
});

const headingText = i18n.translate('xpack.synthetics.overview.alerts.headingText', {
  defaultMessage: 'Last 12 hours',
});
