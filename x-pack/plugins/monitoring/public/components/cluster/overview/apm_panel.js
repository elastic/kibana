/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
// import { formatNumber } from 'plugins/monitoring/lib/format_number';
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
  if (!props.count) {
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
            <EuiDescriptionList type="column" data-test-subj="apm_overview" data-overview-status={props.status}>
              <EuiDescriptionListTitle>Requests</EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="kbnRequests">
                { props.requests_total }
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
                  data-test-subj="kbnInstances"
                  aria-label={`Kibana Instances: ${ props.count }`}
                >
                  Instances: <span data-test-subj="number_of_kibana_instances">{ props.count }</span>
                </EuiLink>
              </h3>
            </EuiTitle>
            <EuiHorizontalRule margin="m" />
            {/* <EuiDescriptionList type="column">
              <EuiDescriptionListTitle>Connections</EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="kbnConnections">
                { formatNumber(props.concurrent_connections, 'int_commas') }
              </EuiDescriptionListDescription>
            </EuiDescriptionList> */}
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGrid>
    </ClusterItemContainer>
  );
}
