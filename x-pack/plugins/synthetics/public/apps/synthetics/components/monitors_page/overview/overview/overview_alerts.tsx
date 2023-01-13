/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingContent,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { RECORDS_FIELD, useTheme } from '@kbn/observability-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useSelector } from 'react-redux';
import { AlertsLink } from '../../../common/links/view_alerts';
import { useAbsoluteDate } from '../../../../hooks';
import { ClientPluginsStart } from '../../../../../../plugin';
import { selectOverviewStatus } from '../../../../state';

export const OverviewAlerts = () => {
  const { from, to } = useAbsoluteDate({ from: 'now-12h/h', to: 'now' });

  const { observability } = useKibana<ClientPluginsStart>().services;
  const { ExploratoryViewEmbeddable } = observability;

  const theme = useTheme();

  const { status } = useSelector(selectOverviewStatus);

  const loading = !status?.enabledIds || status?.enabledIds.length === 0;

  return (
    <EuiPanel hasShadow={false} paddingSize="m" hasBorder>
      <EuiTitle size="xs">
        <h3>{headingText}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      {loading ? (
        <EuiLoadingContent lines={3} />
      ) : (
        <EuiFlexGroup alignItems="center" gutterSize="m">
          <EuiFlexItem grow={false}>
            <ExploratoryViewEmbeddable
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
                    'monitor.id': status?.enabledIds,
                  },
                  filters: [{ field: 'kibana.alert.status', values: ['active', 'recovered'] }],
                  color: theme.eui.euiColorVis1,
                },
              ]}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <ExploratoryViewEmbeddable
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
                    'monitor.id': status?.enabledIds,
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
