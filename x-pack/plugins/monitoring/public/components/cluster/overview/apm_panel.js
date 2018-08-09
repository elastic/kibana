/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { get } from 'lodash';
import { formatMetric } from 'plugins/monitoring/lib/format_number';
import { ClusterItemContainer, HealthStatusIndicator } from './helpers';

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
} from '@elastic/eui';

export function ApmPanel(props) {
  if (!get(props, 'beats.total', 0) > 0) {
    return null;
  }

  const status = props.count > 0 ? 'green' : 'red';

  const statusIndicator = (
    <HealthStatusIndicator status={status} />
  );

  const goToKibana = () => props.changeUrl('apm');
  const goToInstances = () => props.changeUrl('apm/instances');

  return (
    <ClusterItemContainer {...props} statusIndicator={statusIndicator} url="apm" title="Apm">
      <EuiFlexGrid columns={2}>
        <EuiFlexItem>
          <EuiPanel paddingSize="m">
            <EuiTitle size="s">
              <h3>
                <EuiLink
                  onClick={goToKibana}
                  aria-label="Apm Overview"
                  data-test-subj="kbnOverview"
                >
                  Overview
                </EuiLink>
              </h3>
            </EuiTitle>
            <EuiHorizontalRule margin="m" />
            <EuiDescriptionList type="column">
              <EuiDescriptionListTitle>Total Events</EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="beatsTotalEvents">
                {formatMetric(props.totalEvents, '0.[0]a')}
              </EuiDescriptionListDescription>
              <EuiDescriptionListTitle>Bytes Sent</EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="beatsBytesSent">
                {formatMetric(props.bytesSent, 'byte')}
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel paddingSize="m">
            <EuiTitle size="s">
              <h3>
                <EuiLink
                  onClick={goToInstances}
                  aria-label={`Apm Instances: ${props.beats.total}`}
                  data-test-subj="apmListing"
                >
                  APM Servers: <span data-test-subj="beatsTotal">{props.beats.total}</span>
                </EuiLink>
              </h3>
            </EuiTitle>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGrid>
    </ClusterItemContainer>
  );
}
