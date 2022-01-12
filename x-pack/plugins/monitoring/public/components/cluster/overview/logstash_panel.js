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
  BytesPercentageUsage,
  DisabledIfNoDataAndInSetupModeLink,
} from './helpers';
import {
  LOGSTASH,
  LOGSTASH_SYSTEM_ID,
  RULE_LOGSTASH_VERSION_MISMATCH,
} from '../../../../common/constants';

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
  EuiIconTip,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import { SetupModeTooltip } from '../../setup_mode/tooltip';
import { getSafeForExternalLink } from '../../../lib/get_safe_for_external_link';
import { AlertsBadge } from '../../../alerts/badge';
import { shouldShowAlertBadge } from '../../../alerts/lib/should_show_alert_badge';
import { isSetupModeFeatureEnabled } from '../../../lib/setup_mode';
import { SetupModeFeature } from '../../../../common/enums';
import { SetupModeContext } from '../../setup_mode/setup_mode_context';

const NODES_PANEL_RULES = [RULE_LOGSTASH_VERSION_MISMATCH];

export function LogstashPanel(props) {
  const { setupMode } = props;
  const nodesCount = props.node_count || 0;
  const queueTypes = props.queue_types || {};
  const alerts = props.alerts;
  const setupModeContext = React.useContext(SetupModeContext);

  // Do not show if we are not in setup mode
  if (!nodesCount && !setupMode.enabled) {
    return null;
  }

  const goToLogstash = () => getSafeForExternalLink('#/logstash');
  const goToNodes = () => getSafeForExternalLink('#/logstash/nodes');
  const goToPipelines = () => getSafeForExternalLink('#/logstash/pipelines');

  const setupModeData = get(setupMode.data, 'logstash');
  const setupModeMetricbeatMigrationTooltip = isSetupModeFeatureEnabled(
    SetupModeFeature.MetricbeatMigration
  ) ? (
    <SetupModeTooltip
      setupModeData={setupModeData}
      productName={LOGSTASH_SYSTEM_ID}
      badgeClickLink={goToNodes()}
    />
  ) : null;

  let nodesAlertStatus = null;
  if (shouldShowAlertBadge(alerts, NODES_PANEL_RULES, setupModeContext)) {
    const alertsList = NODES_PANEL_RULES.map((alertType) => alerts[alertType]);
    nodesAlertStatus = (
      <EuiFlexItem grow={false}>
        <AlertsBadge alerts={alertsList} />
      </EuiFlexItem>
    );
  }

  return (
    <ClusterItemContainer
      {...props}
      url="logstash"
      title={i18n.translate('xpack.monitoring.cluster.overview.logstashPanel.logstashTitle', {
        defaultMessage: 'Logstash',
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
                  href={goToLogstash()}
                  data-test-subj="lsOverview"
                  aria-label={i18n.translate(
                    'xpack.monitoring.cluster.overview.logstashPanel.overviewLinkAriaLabel',
                    {
                      defaultMessage: 'Logstash Overview',
                    }
                  )}
                >
                  <FormattedMessage
                    id="xpack.monitoring.cluster.overview.logstashPanel.overviewLinkLabel"
                    defaultMessage="Overview"
                  />
                </DisabledIfNoDataAndInSetupModeLink>
              </h3>
            </EuiTitle>
            <EuiHorizontalRule margin="m" />
            <EuiDescriptionList type="column" data-test-subj="logstash_overview">
              <EuiDescriptionListTitle className="eui-textBreakWord">
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.logstashPanel.eventsReceivedLabel"
                  defaultMessage="Events Received"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="lsEventsReceived">
                {formatNumber(props.events_in_total, '0.[0]a')}
              </EuiDescriptionListDescription>
              <EuiDescriptionListTitle className="eui-textBreakWord">
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.logstashPanel.eventsEmittedLabel"
                  defaultMessage="Events Emitted"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="lsEventsEmitted">
                {formatNumber(props.events_out_total, '0.[0]a')}
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
                      href={goToNodes()}
                      data-test-subj="lsNodes"
                      aria-label={i18n.translate(
                        'xpack.monitoring.cluster.overview.logstashPanel.nodesCountLinkAriaLabel',
                        {
                          defaultMessage: 'Logstash Nodes: {nodesCount}',
                          values: { nodesCount },
                        }
                      )}
                    >
                      <FormattedMessage
                        id="xpack.monitoring.cluster.overview.logstashPanel.nodesCountLinkLabel"
                        defaultMessage="Nodes: {nodesCount}"
                        values={{
                          nodesCount: (
                            <span data-test-subj="number_of_logstash_instances">{nodesCount}</span>
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
                  {nodesAlertStatus}
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiHorizontalRule margin="m" />
            <EuiDescriptionList type="column">
              <EuiDescriptionListTitle className="eui-textBreakWord">
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.logstashPanel.uptimeLabel"
                  defaultMessage="Uptime"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="lsUptime">
                {props.max_uptime ? formatNumber(props.max_uptime, 'time_since') : 0}
              </EuiDescriptionListDescription>
              <EuiDescriptionListTitle className="eui-textBreakWord">
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.logstashPanel.jvmHeapLabel"
                  defaultMessage="{javaVirtualMachine} Heap"
                  values={{ javaVirtualMachine: 'JVM' }}
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="lsJvmHeap">
                <BytesPercentageUsage
                  usedBytes={props.avg_memory_used}
                  maxBytes={props.avg_memory}
                />
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          </EuiPanel>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiPanel paddingSize="m">
            <EuiFlexGroup alignItems="center" gutterSize="m">
              <EuiFlexItem grow={false}>
                <EuiTitle size="s">
                  <h3>
                    <DisabledIfNoDataAndInSetupModeLink
                      setupModeEnabled={setupMode.enabled}
                      setupModeData={setupModeData}
                      href={goToPipelines()}
                      data-test-subj="lsPipelines"
                      aria-label={i18n.translate(
                        'xpack.monitoring.cluster.overview.logstashPanel.pipelineCountLinkAriaLabel',
                        {
                          defaultMessage: 'Logstash Pipelines (beta feature): {pipelineCount}',
                          values: { pipelineCount: props.pipeline_count },
                        }
                      )}
                    >
                      <FormattedMessage
                        id="xpack.monitoring.cluster.overview.logstashPanel.pipelinesCountLinkLabel"
                        defaultMessage="Pipelines: {pipelineCount}"
                        values={{
                          pipelineCount: (
                            <span data-test-subj="number_of_logstash_pipelines">
                              {props.pipeline_count}
                            </span>
                          ),
                        }}
                      />
                    </DisabledIfNoDataAndInSetupModeLink>
                  </h3>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiIconTip
                  content={i18n.translate(
                    'xpack.monitoring.cluster.overview.logstashPanel.betaFeatureTooltip',
                    {
                      defaultMessage: 'Beta feature',
                    }
                  )}
                  position="bottom"
                  type="beaker"
                  aria-label="Beta feature"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiHorizontalRule margin="m" />
            <EuiDescriptionList type="column">
              <EuiDescriptionListTitle className="eui-textBreakWord">
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.logstashPanel.withMemoryQueuesLabel"
                  defaultMessage="With Memory Queues"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                {queueTypes[LOGSTASH.QUEUE_TYPES.MEMORY] || 0}
              </EuiDescriptionListDescription>
              <EuiDescriptionListTitle className="eui-textBreakWord">
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.logstashPanel.withPersistentQueuesLabel"
                  defaultMessage="With Persistent Queues"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                {queueTypes[LOGSTASH.QUEUE_TYPES.PERSISTED] || 0}
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGrid>
    </ClusterItemContainer>
  );
}
