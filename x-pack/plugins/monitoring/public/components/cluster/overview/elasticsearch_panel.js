/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import moment from 'moment-timezone';
import { get, capitalize } from 'lodash';
import { formatNumber } from '../../../lib/format_number';
import {
  ClusterItemContainer,
  BytesPercentageUsage,
  DisabledIfNoDataAndInSetupModeLink,
} from './helpers';
import {
  EuiFlexGrid,
  EuiFlexItem,
  EuiLink,
  EuiTitle,
  EuiPanel,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiHorizontalRule,
  EuiBadge,
  EuiToolTip,
  EuiFlexGroup,
  EuiHealth,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { Reason } from '../../logs/reason';
import { SetupModeTooltip } from '../../setup_mode/tooltip';
import { getSafeForExternalLink } from '../../../lib/get_safe_for_external_link';
import {
  ELASTICSEARCH_SYSTEM_ID,
  ALERT_LICENSE_EXPIRATION,
  ALERT_CLUSTER_HEALTH,
  ALERT_CPU_USAGE,
  ALERT_NODES_CHANGED,
  ALERT_ELASTICSEARCH_VERSION_MISMATCH,
} from '../../../../common/constants';
import { AlertsBadge } from '../../../alerts/badge';
import { shouldShowAlertBadge } from '../../../alerts/lib/should_show_alert_badge';

const calculateShards = (shards) => {
  const total = get(shards, 'total', 0);
  let primaries = get(shards, 'primaries', 'N/A');
  let replicas = 'N/A';

  // we subtract primaries from total to get replica count, so if we don't know primaries, then
  //  we cannot know replicas (because we'd be showing the wrong number!)
  if (primaries !== 'N/A') {
    replicas = formatNumber(total - primaries, 'int_commas');
    primaries = formatNumber(primaries, 'int_commas');
  }

  return {
    primaries,
    replicas,
  };
};

const formatDateLocal = (input) => moment.tz(input, moment.tz.guess()).format('LL');

function getBadgeColorFromLogLevel(level) {
  switch (level) {
    case 'warn':
      return 'warning';
    case 'debug':
      return 'hollow';
    case 'info':
      return 'default';
    case 'error':
      return 'danger';
  }
}

function renderLogs(props) {
  if (!props.logs.enabled) {
    return (
      <EuiDescriptionList>
        <Reason reason={props.logs.reason} />
      </EuiDescriptionList>
    );
  }

  return (
    <EuiDescriptionList type="column">
      {props.logs.types.map((log, index) => (
        <Fragment key={index}>
          <EuiDescriptionListTitle>
            <FormattedMessage
              id="xpack.monitoring.cluster.overview.logsPanel.logTypeTitle"
              defaultMessage="{type}"
              values={{
                type: capitalize(log.type),
              }}
            />
          </EuiDescriptionListTitle>
          <EuiDescriptionListDescription>{renderLog(log)}</EuiDescriptionListDescription>
        </Fragment>
      ))}
      {props.logs.types.length === 0 ? (
        <FormattedMessage
          id="xpack.monitoring.cluster.overview.logsPanel.noLogsFound"
          defaultMessage="No logs found."
        />
      ) : null}
    </EuiDescriptionList>
  );
}

const logLevelText = {
  info: i18n.translate('xpack.monitoring.cluster.overview.esPanel.infoLogsTooltipText', {
    defaultMessage: 'The number of information logs',
  }),
  warn: i18n.translate('xpack.monitoring.cluster.overview.esPanel.warnLogsTooltipText', {
    defaultMessage: 'The number of warning logs',
  }),
  debug: i18n.translate('xpack.monitoring.cluster.overview.esPanel.debugLogsTooltipText', {
    defaultMessage: 'The number of debug logs',
  }),
  error: i18n.translate('xpack.monitoring.cluster.overview.esPanel.errorLogsTooltipText', {
    defaultMessage: 'The number of error logs',
  }),
  fatal: i18n.translate('xpack.monitoring.cluster.overview.esPanel.fatalLogsTooltipText', {
    defaultMessage: 'The number of fatal logs',
  }),
  unknown: i18n.translate('xpack.monitoring.cluster.overview.esPanel.unknownLogsTooltipText', {
    defaultMessage: 'Unknown',
  }),
};

function renderLog(log) {
  return (
    <EuiFlexGroup wrap responsive={false} gutterSize="xs">
      {log.levels.map((level, index) => (
        <EuiFlexItem grow={false} key={index}>
          <EuiToolTip position="top" content={logLevelText[level.level] || logLevelText.unknown}>
            <EuiBadge color={getBadgeColorFromLogLevel(level.level)}>
              {formatNumber(level.count, 'int_commas')}
            </EuiBadge>
          </EuiToolTip>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}

const OVERVIEW_PANEL_ALERTS = [ALERT_CLUSTER_HEALTH, ALERT_LICENSE_EXPIRATION];

const NODES_PANEL_ALERTS = [
  ALERT_CPU_USAGE,
  ALERT_NODES_CHANGED,
  ALERT_ELASTICSEARCH_VERSION_MISMATCH,
];

export function ElasticsearchPanel(props) {
  const clusterStats = props.cluster_stats || {};
  const nodes = clusterStats.nodes;
  const indices = clusterStats.indices;
  const setupMode = props.setupMode;
  const alerts = props.alerts;

  const goToElasticsearch = () => getSafeForExternalLink('#/elasticsearch');
  const goToNodes = () => getSafeForExternalLink('#/elasticsearch/nodes');
  const goToIndices = () => getSafeForExternalLink('#/elasticsearch/indices');

  const { primaries, replicas } = calculateShards(get(props, 'cluster_stats.indices.shards', {}));

  const setupModeData = get(setupMode.data, 'elasticsearch');
  const setupModeTooltip =
    setupMode && setupMode.enabled ? (
      <SetupModeTooltip
        setupModeData={setupModeData}
        productName={ELASTICSEARCH_SYSTEM_ID}
        badgeClickLink={goToNodes()}
      />
    ) : null;

  const showMlJobs = () => {
    // if license doesn't support ML, then `ml === null`
    if (props.ml) {
      const gotoURL = getSafeForExternalLink('#/elasticsearch/ml_jobs');
      return (
        <>
          <EuiDescriptionListTitle>
            <DisabledIfNoDataAndInSetupModeLink
              setupModeEnabled={setupMode.enabled}
              setupModeData={setupModeData}
              href={gotoURL}
            >
              <FormattedMessage
                id="xpack.monitoring.cluster.overview.esPanel.jobsLabel"
                defaultMessage="Jobs"
              />
            </DisabledIfNoDataAndInSetupModeLink>
          </EuiDescriptionListTitle>
          <EuiDescriptionListDescription data-test-subj="esMlJobs">
            <DisabledIfNoDataAndInSetupModeLink
              setupModeEnabled={setupMode.enabled}
              setupModeData={setupModeData}
              href={gotoURL}
            >
              {props.ml.jobs}
            </DisabledIfNoDataAndInSetupModeLink>
          </EuiDescriptionListDescription>
        </>
      );
    }
    return null;
  };

  const statusColorMap = {
    green: 'success',
    yellow: 'warning',
    red: 'danger',
  };

  let nodesAlertStatus = null;
  if (shouldShowAlertBadge(alerts, NODES_PANEL_ALERTS)) {
    const alertsList = NODES_PANEL_ALERTS.map((alertType) => alerts[alertType]);
    nodesAlertStatus = (
      <EuiFlexItem grow={false}>
        <AlertsBadge alerts={alertsList} />
      </EuiFlexItem>
    );
  }

  let overviewAlertStatus = null;
  if (shouldShowAlertBadge(alerts, OVERVIEW_PANEL_ALERTS)) {
    const alertsList = OVERVIEW_PANEL_ALERTS.map((alertType) => alerts[alertType]);
    overviewAlertStatus = (
      <EuiFlexItem grow={false}>
        <AlertsBadge alerts={alertsList} />
      </EuiFlexItem>
    );
  }

  return (
    <ClusterItemContainer {...props} url="elasticsearch" title="Elasticsearch">
      <EuiFlexGrid columns={4}>
        <EuiFlexItem>
          <EuiPanel paddingSize="m">
            <EuiFlexGroup justifyContent="spaceBetween" gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiTitle size="s">
                  <h3>
                    <DisabledIfNoDataAndInSetupModeLink
                      setupModeEnabled={setupMode.enabled}
                      setupModeData={setupModeData}
                      href={goToElasticsearch()}
                      aria-label={i18n.translate(
                        'xpack.monitoring.cluster.overview.esPanel.overviewLinkAriaLabel',
                        {
                          defaultMessage: 'Elasticsearch Overview',
                        }
                      )}
                      data-test-subj="esOverview"
                    >
                      <FormattedMessage
                        id="xpack.monitoring.cluster.overview.esPanel.overviewLinkLabel"
                        defaultMessage="Overview"
                      />
                    </DisabledIfNoDataAndInSetupModeLink>
                  </h3>
                </EuiTitle>
              </EuiFlexItem>
              {overviewAlertStatus}
            </EuiFlexGroup>
            <EuiHorizontalRule margin="m" />
            <EuiDescriptionList type="column">
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.esPanel.healthLabel"
                  defaultMessage="Health"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                <EuiHealth color={statusColorMap[clusterStats.status]} data-test-subj="statusIcon">
                  <FormattedMessage
                    id="xpack.monitoring.cluster.overview.healthStatusDescription"
                    defaultMessage="Health is {status}"
                    values={{ status: clusterStats.status || 'n/a' }}
                  />
                </EuiHealth>
              </EuiDescriptionListDescription>
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.esPanel.versionLabel"
                  defaultMessage="Version"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="esVersion">
                {props.version ||
                  i18n.translate(
                    'xpack.monitoring.cluster.overview.esPanel.versionNotAvailableDescription',
                    {
                      defaultMessage: 'N/A',
                    }
                  )}
              </EuiDescriptionListDescription>
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.esPanel.uptimeLabel"
                  defaultMessage="Uptime"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="esUptime">
                {formatNumber(get(nodes, 'jvm.max_uptime_in_millis'), 'time_since')}
              </EuiDescriptionListDescription>
              {showMlJobs()}
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.esPanel.licenseLabel"
                  defaultMessage="License"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="esLicenseType">
                <EuiFlexGroup direction="column" gutterSize="xs">
                  <EuiFlexItem grow={false}>
                    <EuiLink href={getSafeForExternalLink('#/license')}>
                      {capitalize(props.license.type)}
                    </EuiLink>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s">
                      {props.license.expiry_date_in_millis === undefined ? (
                        ''
                      ) : (
                        <FormattedMessage
                          id="xpack.monitoring.cluster.overview.esPanel.expireDateText"
                          defaultMessage="expires on {expiryDate}"
                          values={{
                            expiryDate: formatDateLocal(props.license.expiry_date_in_millis),
                          }}
                        />
                      )}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
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
                    <EuiLink data-test-subj="esNumberOfNodes" href={goToNodes()}>
                      <FormattedMessage
                        id="xpack.monitoring.cluster.overview.esPanel.nodesTotalLinkLabel"
                        defaultMessage="Nodes: {nodesTotal}"
                        values={{
                          nodesTotal: formatNumber(get(nodes, 'count.total'), 'int_commas'),
                        }}
                      />
                    </EuiLink>
                  </h3>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="s" alignItems="center">
                  {setupModeTooltip}
                  {nodesAlertStatus}
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiHorizontalRule margin="m" />
            <EuiDescriptionList type="column">
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.esPanel.diskAvailableLabel"
                  defaultMessage="Disk Available"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="esDiskAvailable">
                <BytesPercentageUsage
                  usedBytes={get(nodes, 'fs.available_in_bytes')}
                  maxBytes={get(nodes, 'fs.total_in_bytes')}
                />
              </EuiDescriptionListDescription>
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.esPanel.jvmHeapLabel"
                  defaultMessage="{javaVirtualMachine} Heap"
                  values={{ javaVirtualMachine: 'JVM' }}
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="esJvmHeap">
                <BytesPercentageUsage
                  usedBytes={get(nodes, 'jvm.mem.heap_used_in_bytes')}
                  maxBytes={get(nodes, 'jvm.mem.heap_max_in_bytes')}
                />
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          </EuiPanel>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiPanel paddingSize="m">
            <EuiTitle size="s">
              <h3>
                <DisabledIfNoDataAndInSetupModeLink
                  setupModeEnabled={setupMode.enabled}
                  setupModeData={setupModeData}
                  href={goToIndices()}
                  data-test-subj="esNumberOfIndices"
                  aria-label={i18n.translate(
                    'xpack.monitoring.cluster.overview.esPanel.indicesCountLinkAriaLabel',
                    {
                      defaultMessage: 'Elasticsearch Indices: {indicesCount}',
                      values: { indicesCount: formatNumber(get(indices, 'count'), 'int_commas') },
                    }
                  )}
                >
                  <FormattedMessage
                    id="xpack.monitoring.cluster.overview.esPanel.indicesCountLinkLabel"
                    defaultMessage="Indices: {indicesCount}"
                    values={{ indicesCount: formatNumber(get(indices, 'count'), 'int_commas') }}
                  />
                </DisabledIfNoDataAndInSetupModeLink>
              </h3>
            </EuiTitle>
            <EuiHorizontalRule margin="m" />
            <EuiDescriptionList type="column">
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.esPanel.documentsLabel"
                  defaultMessage="Documents"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="esDocumentsCount">
                {formatNumber(get(indices, 'docs.count'), 'int_commas')}
              </EuiDescriptionListDescription>

              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.esPanel.diskUsageLabel"
                  defaultMessage="Disk Usage"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="esDiskUsage">
                {formatNumber(get(indices, 'store.size_in_bytes'), 'byte')}
              </EuiDescriptionListDescription>

              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.esPanel.primaryShardsLabel"
                  defaultMessage="Primary Shards"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="esPrimaryShards">
                {primaries}
              </EuiDescriptionListDescription>

              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.esPanel.replicaShardsLabel"
                  defaultMessage="Replica Shards"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="esReplicaShards">
                {replicas}
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          </EuiPanel>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiPanel paddingSize="m">
            <EuiTitle size="s">
              <h3>
                <DisabledIfNoDataAndInSetupModeLink
                  setupModeEnabled={setupMode.enabled}
                  setupModeData={setupModeData}
                  href={goToElasticsearch()}
                  aria-label={i18n.translate(
                    'xpack.monitoring.cluster.overview.esPanel.logsLinkAriaLabel',
                    {
                      defaultMessage: 'Elasticsearch Logs',
                    }
                  )}
                  data-test-subj="esLogs"
                >
                  <FormattedMessage
                    id="xpack.monitoring.cluster.overview.esPanel.logsLinkLabel"
                    defaultMessage="Logs"
                  />
                </DisabledIfNoDataAndInSetupModeLink>
              </h3>
            </EuiTitle>
            <EuiHorizontalRule margin="m" />
            {renderLogs(props)}
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGrid>
    </ClusterItemContainer>
  );
}
