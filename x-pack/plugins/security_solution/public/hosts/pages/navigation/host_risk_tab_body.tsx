/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { HostRiskScoreOverTime } from '../../components/host_score_over_time';
import { TopHostScoreContributors } from '../../components/top_host_score_contributors';
import { HostsComponentsQueryProps } from './types';

const HostRiskTabBodyComponent: React.FC<HostsComponentsQueryProps & { hostName: string }> = ({
  hostName,
  startDate,
  endDate,
  filterQuery,
}) => {
  return (
    <EuiFlexGroup direction="row">
      <EuiFlexItem grow={2}>
        <HostRiskScoreOverTime
          hostName={hostName}
          from={startDate}
          to={endDate}
          filterQuery={filterQuery}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={1}>
        <TopHostScoreContributors
          hostName={hostName}
          from={startDate}
          to={endDate}
          filterQuery={filterQuery}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

HostRiskTabBodyComponent.displayName = 'HostRiskTabBodyComponent';

export const HostRiskTabBody = React.memo(HostRiskTabBodyComponent);

HostRiskTabBody.displayName = 'HostRiskTabBody';
