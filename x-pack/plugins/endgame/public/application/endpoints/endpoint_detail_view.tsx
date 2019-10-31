/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiLoadingSpinner,
  EuiCode,
  EuiSpacer,
  EuiPanel,
  EuiHealth,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
} from '@elastic/eui';
import { withEndpointDetailData } from '../../common/with_endpoint_detail_data';

export class EndpointDetail extends PureComponent<{
  endpoint: object;
}> {
  render() {
    const { endpoint } = this.props;

    if (!endpoint) {
      return <EuiLoadingSpinner size="xl" />;
    }

    const hostInfo = [
      {
        title: 'Name',
        description: endpoint._source.host.name,
      },
      {
        title: 'IP',
        description: endpoint._source.host.ip,
      },
      {
        title: 'MAC Address',
        description: endpoint._source.host.mac_address,
      },
      {
        title: 'Domain',
        description: endpoint._source.endpoint.domain,
      },
      {
        title: 'AD',
        description: endpoint._source.endpoint.advertised_distinguished_name,
      },
    ];

    return (
      <section>
        <EuiTitle>
          <h1>
            {endpoint._source.host.hostname} <EuiCode>{endpoint._source.host.ip}</EuiCode>
          </h1>
        </EuiTitle>

        <EuiSpacer size="xxl" />

        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiPanel betaBadgeLabel="Host">
              <EuiDescriptionList listItems={hostInfo} type="column" />
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiPanel betaBadgeLabel="Runtime">
              <EuiDescriptionList type="column">
                <EuiDescriptionListTitle>Platform</EuiDescriptionListTitle>
                <EuiDescriptionListDescription>
                  {endpoint._source.host.os.name}
                </EuiDescriptionListDescription>
                <EuiDescriptionListTitle>OS</EuiDescriptionListTitle>
                <EuiDescriptionListDescription>
                  {endpoint._source.host.os.full}
                </EuiDescriptionListDescription>
                <EuiDescriptionListTitle>Machine ID</EuiDescriptionListTitle>
                <EuiDescriptionListDescription>
                  {endpoint._source.machine_id}
                </EuiDescriptionListDescription>
              </EuiDescriptionList>
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiPanel betaBadgeLabel="Sensor">
              <EuiDescriptionList type="column">
                <EuiDescriptionListTitle>Version</EuiDescriptionListTitle>
                <EuiDescriptionListDescription>
                  {/* FIXME: get real data */ '1.2.3.4'}
                </EuiDescriptionListDescription>
                <EuiDescriptionListTitle>Status</EuiDescriptionListTitle>
                <EuiDescriptionListDescription>
                  {/* FIXME: get real data */}
                  <EuiHealth color="success">Active</EuiHealth>
                </EuiDescriptionListDescription>
                <EuiDescriptionListTitle>Policy ID</EuiDescriptionListTitle>
                <EuiDescriptionListDescription>
                  {endpoint._source.endpoint.policy.id}
                </EuiDescriptionListDescription>
                <EuiDescriptionListTitle>Isolated</EuiDescriptionListTitle>
                <EuiDescriptionListDescription>
                  {endpoint._source.endpoint.isolation.status ? 'Yes' : 'No'}
                </EuiDescriptionListDescription>
              </EuiDescriptionList>
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="xxl" style={{ height: '60em' }} />
        <code>
          <pre>{JSON.stringify(endpoint, null, 4)}</pre>
        </code>
      </section>
    );
  }
}

export const EndpointDetailConnected = withEndpointDetailData(EndpointDetail);
