/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import { formatBytesUsage, formatPercentageUsage, formatNumber } from '../../../lib/format_number';
import {
  EuiSpacer,
  EuiFlexItem,
  EuiFlexGroup,
  EuiTitle,
  EuiIcon,
  EuiHealth,
  EuiText,
  EuiLink,
} from '@elastic/eui';

export function HealthLabel(props) {
  if (props.status === 'green') {
    return i18n.translate('xpack.monitoring.cluster.health.healthy', {
      defaultMessage: 'Healthy',
    });
  }

  if (props.status === 'yellow') {
    return i18n.translate('xpack.monitoring.cluster.health.replicaShards', {
      defaultMessage: 'Missing replica shards',
    });
  }

  if (props.status === 'red') {
    return i18n.translate('xpack.monitoring.cluster.health.primaryShards', {
      defaultMessage: 'Missing primary shards',
    });
  }

  return 'N/A';
}

export function HealthStatusIndicator(props) {
  const statusColorMap = {
    green: 'success',
    yellow: 'warning',
    red: 'danger',
  };

  const statusColor = statusColorMap[props.status] || 'n/a';

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiHealth color={statusColor} data-test-subj="statusIcon">
          <HealthLabel status={props.status} />
        </EuiHealth>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

const PanelExtras = ({ extras }) => {
  if (extras === undefined) {
    return null;
  }

  // mimic the spacing of an EuiHealth which this is adjacent to
  return <EuiFlexItem grow={false}>{extras}</EuiFlexItem>;
};

export function ClusterItemContainer(props) {
  const iconMap = {
    elasticsearch: 'logoElasticsearch',
    kibana: 'logoKibana',
    logstash: 'logoLogstash',
    beats: 'logoBeats',
    apm: 'apmApp',
  };
  const icon = iconMap[props.url];

  return (
    <div data-test-subj={`clusterItemContainer${props.title}`}>
      <EuiFlexGroup gutterSize="m" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="m" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiIcon type={icon} size="l" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiTitle>
                <h2>{props.title}</h2>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{props.statusIndicator}</EuiFlexItem>
        <PanelExtras extras={props.extras} />
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {props.children}

      <EuiSpacer size="xxl" />
    </div>
  );
}

export function BytesUsage({ usedBytes, maxBytes }) {
  if (usedBytes && maxBytes) {
    return (
      <span>
        <EuiText>{formatBytesUsage(usedBytes, maxBytes)}</EuiText>
      </span>
    );
  } else if (usedBytes) {
    return (
      <span>
        <EuiText>{formatNumber(usedBytes, 'byte')}</EuiText>
      </span>
    );
  }

  return null;
}

export function BytesPercentageUsage({ usedBytes, maxBytes }) {
  if (usedBytes && maxBytes) {
    return (
      <span>
        <EuiText>{formatPercentageUsage(usedBytes, maxBytes)}</EuiText>
        <EuiText color="subdued" size="s">
          {formatBytesUsage(usedBytes, maxBytes)}
        </EuiText>
      </span>
    );
  }

  return <EuiText>0</EuiText>;
}

export function DisabledIfNoDataAndInSetupModeLink({
  setupModeEnabled,
  setupModeData,
  children,
  ...props
}) {
  if (setupModeEnabled && get(setupModeData, 'totalUniqueInstanceCount', 0) === 0) {
    return children;
  }

  return <EuiLink {...props}>{children}</EuiLink>;
}
