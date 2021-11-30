/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem, EuiFlexGroup } from '@elastic/eui';

import { HostsKpiAuthentications } from './authentications';
import { HostsKpiHosts } from './hosts';
import { HostsKpiUniqueIps } from './unique_ips';
import { HostsKpiProps } from './types';
import { HostsChart } from '../../../common/components/stat_items/hosts_chart';

export const HostsKpiComponent = React.memo<HostsKpiProps>(
  ({ filterQuery, from, indexNames, to, setQuery, skip, narrowDateRange }) => (
    <>
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

      <HostsChart />
    </>
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
