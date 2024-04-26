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

export const UsersKpiComponent = React.memo<UsersKpiProps>(({ from, to }) => (
  <EuiFlexGroup wrap>
    <EuiFlexItem grow={1}>
      <TotalUsersKpi from={from} to={to} />
    </EuiFlexItem>

    <EuiFlexItem grow={2}>
      <UsersKpiAuthentications from={from} to={to} />
    </EuiFlexItem>
  </EuiFlexGroup>
));

UsersKpiComponent.displayName = 'UsersKpiComponent';
