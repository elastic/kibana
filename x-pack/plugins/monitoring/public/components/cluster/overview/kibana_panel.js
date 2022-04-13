/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { formatNumber } from '../../../lib/format_number';
import {
  ClusterItemContainer,
  HealthStatusIndicator,
  BytesPercentageUsage,
  DisabledIfNoDataAndInSetupModeLink,
} from './helpers';
import { get } from 'lodash';
import {
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiTitle,
  EuiPanel,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiHorizontalRule,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { SetupModeTooltip } from '../../setup_mode/tooltip';
import { KIBANA_SYSTEM_ID, RULE_KIBANA_VERSION_MISMATCH } from '../../../../common/constants';
import { getSafeForExternalLink } from '../../../lib/get_safe_for_external_link';
import { AlertsBadge } from '../../../alerts/badge';
import { shouldShowAlertBadge } from '../../../alerts/lib/should_show_alert_badge';
import { isSetupModeFeatureEnabled } from '../../../lib/setup_mode';
import { SetupModeFeature } from '../../../../common/enums';
import { SetupModeContext } from '../../setup_mode/setup_mode_context';

const INSTANCES_PANEL_ALERTS = [RULE_KIBANA_VERSION_MISMATCH];

export function KibanaPanel(props) {
  const setupMode = props.setupMode;
  const alerts = props.alerts;
  const setupModeContext = React.useContext(SetupModeContext);
  const showDetectedKibanas =
    setupMode.enabled && get(setupMode.data, 'kibana.detected.doesExist', false);
  if (!props.count && !showDetectedKibanas) {
    return null;
  }

  const statusIndicator = <HealthStatusIndicator status={props.status} product={'kb'} />;

  const goToKibana = () => getSafeForExternalLink('#/kibana');
  const goToInstances = () => getSafeForExternalLink('#/kibana/instances');

  const setupModeData = get(setupMode.data, 'kibana');
  const setupModeMetricbeatMigrationTooltip = isSetupModeFeatureEnabled(
    SetupModeFeature.MetricbeatMigration
  ) ? (
    <SetupModeTooltip
      setupModeData={setupModeData}
      productName={KIBANA_SYSTEM_ID}
      badgeClickLink={goToInstances()}
    />
  ) : null;

  let instancesAlertStatus = null;
  if (shouldShowAlertBadge(alerts, INSTANCES_PANEL_ALERTS, setupModeContext)) {
    const alertsList = INSTANCES_PANEL_ALERTS.map((alertType) => alerts[alertType]);
    instancesAlertStatus = (
      <EuiFlexItem grow={false}>
        <AlertsBadge alerts={alertsList} />
      </EuiFlexItem>
    );
  }

  return (
    <ClusterItemContainer
      {...props}
      statusIndicator={statusIndicator}
      url="kibana"
      title={i18n.translate('xpack.monitoring.cluster.overview.kibanaPanel.kibanaTitle', {
        defaultMessage: 'Kibana',
      })}
    >
      <EuiFlexGrid columns={4}>
        <EuiFlexItem>
          <EuiPanel paddingSize="m">
            <EuiTitle size="s">
              <h3>
                <DisabledIfNoDataAndInSetupModeLink
                  setupModeEnabled={setupMode.enabled}
                  setupModeData={setupModeData}
                  href={goToKibana()}
                  aria-label={i18n.translate(
                    'xpack.monitoring.cluster.overview.kibanaPanel.overviewLinkAriaLabel',
                    {
                      defaultMessage: 'Kibana Overview',
                    }
                  )}
                  data-test-subj="kbnOverview"
                >
                  <FormattedMessage
                    id="xpack.monitoring.cluster.overview.kibanaPanel.overviewLinkLabel"
                    defaultMessage="Overview"
                  />
                </DisabledIfNoDataAndInSetupModeLink>
              </h3>
            </EuiTitle>
            <EuiHorizontalRule margin="m" />
            <EuiDescriptionList
              type="column"
              data-test-subj="kibana_overview"
              data-overview-status={props.status}
            >
              <EuiDescriptionListTitle className="eui-textBreakWord">
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.kibanaPanel.requestsLabel"
                  defaultMessage="Requests"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="kbnRequests">
                {props.requests_total}
              </EuiDescriptionListDescription>
              <EuiDescriptionListTitle className="eui-textBreakWord">
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.kibanaPanel.maxResponseTimeLabel"
                  defaultMessage="Max. Response Time"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="kbnMaxResponseTime">
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.kibanaPanel.maxResponseTimeDescription"
                  defaultMessage="{maxTime} ms"
                  values={{ maxTime: props.response_time_max }}
                />
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel paddingSize="m">
            <EuiFlexGroup justifyContent="spaceBetween" gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiTitle size="s">
                  <h3>
                    <EuiLink
                      href={goToInstances()}
                      data-test-subj="kbnInstances"
                      aria-label={i18n.translate(
                        'xpack.monitoring.cluster.overview.kibanaPanel.instancesCountLinkAriaLabel',
                        {
                          defaultMessage: 'Kibana Instances: {instancesCount}',
                          values: { instancesCount: props.count },
                        }
                      )}
                    >
                      <FormattedMessage
                        id="xpack.monitoring.cluster.overview.kibanaPanel.instancesCountLinkLabel"
                        defaultMessage="Instances: {instancesCount}"
                        values={{
                          instancesCount: (
                            <span data-test-subj="number_of_kibana_instances">{props.count}</span>
                          ),
                        }}
                      />
                    </EuiLink>
                  </h3>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="s" alignItems="center">
                  {setupModeMetricbeatMigrationTooltip}
                  {instancesAlertStatus}
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiHorizontalRule margin="m" />
            <EuiDescriptionList type="column">
              <EuiDescriptionListTitle className="eui-textBreakWord">
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.kibanaPanel.connectionsLabel"
                  defaultMessage="Connections"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="kbnConnections">
                {formatNumber(props.concurrent_connections, 'int_commas')}
              </EuiDescriptionListDescription>
              <EuiDescriptionListTitle className="eui-textBreakWord">
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.kibanaPanel.memoryUsageLabel"
                  defaultMessage="Memory Usage"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="kbnMemoryUsage">
                <BytesPercentageUsage usedBytes={props.memory_size} maxBytes={props.memory_limit} />
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGrid>
    </ClusterItemContainer>
  );
}
