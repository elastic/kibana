/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem, EuiFlexGroup } from '@elastic/eui';

import { HostsKpiHosts } from './hosts';
import { HostsKpiUniqueIps } from './unique_ips';
import type { HostsKpiProps } from './types';

export const HostsKpiComponent = React.memo<HostsKpiProps>(
  ({ filterQuery, from, indexNames, to, setQuery, skip, updateDateRange }) => (
    <EuiFlexGroup wrap>
      <EuiFlexItem grow={1}>
        <HostsKpiHosts
          filterQuery={filterQuery}
          from={from}
          indexNames={indexNames}
          to={to}
          updateDateRange={updateDateRange}
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
          updateDateRange={updateDateRange}
          setQuery={setQuery}
          skip={skip}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  )
);

HostsKpiComponent.displayName = 'HostsKpiComponent';

export const HostsDetailsKpiComponent = React.memo<HostsKpiProps>(
  ({ filterQuery, from, indexNames, to, setQuery, skip, updateDateRange }) => {
    return (
      <EuiFlexGroup wrap>
        <EuiFlexItem grow={1}>
          <HostsKpiUniqueIps
            filterQuery={filterQuery}
            from={from}
            indexNames={indexNames}
            to={to}
            updateDateRange={updateDateRange}
            setQuery={setQuery}
            skip={skip}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

HostsDetailsKpiComponent.displayName = 'HostsDetailsKpiComponent';
