/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiStat, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';

export const TimelineKPIs = React.memo(
  ({
    processes,
    users,
    hosts,
    sourceIps,
    destinationIps,
  }: {
    processes: number;
    users: number;
    hosts: number;
    sourceIps: number;
    destinationIps: number;
  }) => {
    //TODO: intl descriptions
    return (
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiStat title={processes} description="Processes" titleSize="s" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat title={users} description="Users" titleSize="s" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat title={hosts} description="Hosts" titleSize="s" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat title={sourceIps} description="Source IPs" titleSize="s" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat title={destinationIps} description="Destination IPs" titleSize="s" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

TimelineKPIs.displayName = 'TimelineKPIs';
