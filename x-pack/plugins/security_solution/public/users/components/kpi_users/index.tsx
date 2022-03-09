/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem, EuiFlexGroup } from '@elastic/eui';

import { UsersKpiProps } from './types';

import { HostsKpiAuthentications } from '../../../hosts/components/kpi_hosts/authentications';
import { HostsKpiUniqueIps } from '../../../hosts/components/kpi_hosts/unique_ips';
import { UsersKpiHosts } from './total_users';

export const UsersKpiComponent = React.memo<UsersKpiProps>(
  ({ filterQuery, from, indexNames, to, setQuery, skip, narrowDateRange }) => {
    return (
      <>
        <EuiFlexGroup wrap>
          <EuiFlexItem grow={1}>
            <UsersKpiHosts
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
      </>
    );
  }
);

UsersKpiComponent.displayName = 'HostsKpiComponent';
