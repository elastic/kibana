/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import type { UsersKpiProps } from './types';
import { UsersKpiAuthentications } from './authentications';
import { TotalUsersKpi } from './total_users';

export const UsersKpiComponent = React.memo<UsersKpiProps>(
  ({ filterQuery, from, indexNames, to, setQuery, skip, updateDateRange }) => (
    <EuiFlexGroup wrap>
      <EuiFlexItem grow={1}>
        <TotalUsersKpi
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
        <UsersKpiAuthentications
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

UsersKpiComponent.displayName = 'UsersKpiComponent';
