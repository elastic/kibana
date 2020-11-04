/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexItem, EuiFlexGroup } from '@elastic/eui';

import { HostsKpiAuthentications } from './authentications';
import { HostsKpiHosts } from './hosts';
import { HostsKpiUniqueIps } from './unique_ips';
import { HostsKpiProps } from './types';

export const HostsKpiComponent = React.memo<HostsKpiProps>(
  ({ filterQuery, from, indexNames, to, setQuery, skip, narrowDateRange }) => (
    <EuiFlexGroup wrap>
      <EuiFlexItem grow={1}>
        <HostsKpiHosts
          filterQuery={filterQuery}
          from={from}
          indexNames={indexNames}
          to={to}
          narrowDateRange={narrowDateRange}
          setQuery={setQuery}
          skip={skip}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={2}>
        <HostsKpiAuthentications
          filterQuery={filterQuery}
          from={from}
          indexNames={indexNames}
          to={to}
          narrowDateRange={narrowDateRange}
          setQuery={setQuery}
          skip={skip}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={2}>
        <HostsKpiUniqueIps
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

HostsKpiComponent.displayName = 'HostsKpiComponent';

export const HostsDetailsKpiComponent = React.memo<HostsKpiProps>(
  ({ filterQuery, from, indexNames, to, setQuery, skip, narrowDateRange }) => (
    <EuiFlexGroup wrap>
      <EuiFlexItem grow={1}>
        <HostsKpiAuthentications
          filterQuery={filterQuery}
          from={from}
          indexNames={indexNames}
          to={to}
          narrowDateRange={narrowDateRange}
          setQuery={setQuery}
          skip={skip}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={1}>
        <HostsKpiUniqueIps
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

HostsDetailsKpiComponent.displayName = 'HostsDetailsKpiComponent';
