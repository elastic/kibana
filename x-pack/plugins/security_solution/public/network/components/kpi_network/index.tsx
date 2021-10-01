/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem, EuiFlexGroup, EuiSpacer } from '@elastic/eui';

import { NetworkKpiDns } from './dns';
import { NetworkKpiNetworkEvents } from './network_events';
import { NetworkKpiTlsHandshakes } from './tls_handshakes';
import { NetworkKpiUniqueFlows } from './unique_flows';
import { NetworkKpiUniquePrivateIps } from './unique_private_ips';
import { NetworkKpiProps } from './types';

export const NetworkKpiComponent = React.memo<NetworkKpiProps>(
  ({ filterQuery, from, indexNames, to, setQuery, skip, narrowDateRange }) => (
    <EuiFlexGroup wrap>
      <EuiFlexItem grow={1}>
        <EuiFlexGroup wrap>
          <EuiFlexItem>
            <NetworkKpiNetworkEvents
              filterQuery={filterQuery}
              from={from}
              indexNames={indexNames}
              to={to}
              narrowDateRange={narrowDateRange}
              setQuery={setQuery}
              skip={skip}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <NetworkKpiDns
              filterQuery={filterQuery}
              from={from}
              indexNames={indexNames}
              to={to}
              narrowDateRange={narrowDateRange}
              setQuery={setQuery}
              skip={skip}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="l" />
        <EuiFlexGroup wrap>
          <EuiFlexItem>
            <NetworkKpiUniqueFlows
              filterQuery={filterQuery}
              from={from}
              indexNames={indexNames}
              to={to}
              narrowDateRange={narrowDateRange}
              setQuery={setQuery}
              skip={skip}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <NetworkKpiTlsHandshakes
              filterQuery={filterQuery}
              from={from}
              indexNames={indexNames}
              to={to}
              narrowDateRange={narrowDateRange}
              setQuery={setQuery}
              skip={skip}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={1}>
        <NetworkKpiUniquePrivateIps
          filterQuery={filterQuery}
          from={from}
          indexNames={indexNames}
          to={to}
          narrowDateRange={narrowDateRange}
          setQuery={setQuery}
          skip={skip}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  )
);

NetworkKpiComponent.displayName = 'NetworkKpiComponent';
