/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { formatBytesUsage, formatPercentageUsage } from 'plugins/monitoring/lib/format_number';

import {
  EuiSpacer,
  EuiFlexItem,
  EuiFlexGroup,
  EuiTitle,
  EuiIcon,
  EuiHealth,
  EuiText,
} from '@elastic/eui';

export function HealthStatusIndicator(props) {

  const statusColorMap = {
    green: 'success',
    yellow: 'warning',
    red: 'danger'
  };

  const statusColor = statusColorMap[props.status];

  return (
    <EuiHealth color={statusColor} data-test-subj="statusIcon">
      Health is {props.status}
    </EuiHealth>
  );
}

const PanelExtras = ({ extras }) => {
  if (extras === undefined) {
    return null;
  }

  // mimic the spacing of an EuiHealth which this is adjacent to
  return (
    <EuiFlexItem grow={false}>
      {extras}
    </EuiFlexItem>
  );
};

export function ClusterItemContainer(props) {
  const iconMap = {
    elasticsearch: 'logoElasticSearch',
    kibana: 'logoKibana',
    logstash: 'logoLogstash',
    beats: 'logoBeats',
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
                <h2>
                  { props.title }
                </h2>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          { props.statusIndicator }
        </EuiFlexItem>
        <PanelExtras extras={props.extras} />
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      { props.children }

      <EuiSpacer size="xxl" />
    </div>
  );
}

export function BytesUsage({ usedBytes, maxBytes }) {
  if (usedBytes && maxBytes) {
    return (
      <span>
        <EuiText>
          { formatPercentageUsage(usedBytes, maxBytes) }
        </EuiText>
        <EuiText color="subdued" size="s">
          { formatBytesUsage(usedBytes, maxBytes) }
        </EuiText>
      </span>
    );
  }

  return null;
}

export function BytesPercentageUsage({ usedBytes, maxBytes }) {
  if (usedBytes && maxBytes) {
    return (
      <span>
        <EuiText>
          { formatPercentageUsage(usedBytes, maxBytes) }
        </EuiText>
        <EuiText color="subdued" size="s">
          { formatBytesUsage(usedBytes, maxBytes) }
        </EuiText>
      </span>
    );
  }

  return null;
}
