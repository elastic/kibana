/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';

import { HostsKpiHosts } from './hosts';
import type { HostsKpiProps } from './types';
import { HostsKpiUniqueIps } from './unique_ips';

export const HostsKpiComponent = React.memo<HostsKpiProps>(({ from, to }) => (
  <EuiFlexGroup wrap>
    <EuiFlexItem grow={1}>
      <HostsKpiHosts from={from} to={to} />
    </EuiFlexItem>
    <EuiFlexItem grow={2}>
      <HostsKpiUniqueIps from={from} to={to} />
    </EuiFlexItem>
  </EuiFlexGroup>
));

HostsKpiComponent.displayName = 'HostsKpiComponent';
