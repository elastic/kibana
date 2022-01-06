/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { HostRiskScoreOverTime } from '../../components/host_score_over_time';
import { TopHostScoreContributors } from '../../components/top_host_score_contributors';
import { HostsComponentsQueryProps } from './types';

import { useRiskyHostsDashboardButtonHref } from '../../../overview/containers/overview_risky_host_links/use_risky_hosts_dashboard_button_href';
import { HostRiskInformation } from '../../components/host_risk_information';

const HostRiskTabBodyComponent: React.FC<HostsComponentsQueryProps & { hostName: string }> = ({
  hostName,
  startDate,
  endDate,
  filterQuery,
}) => {
  const { buttonHref } = useRiskyHostsDashboardButtonHref(startDate, endDate);

  return (
    <>
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
      <EuiButton
        href={buttonHref}
        isDisabled={!buttonHref}
        data-test-subj="risky-hosts-view-dashboard-button"
        target="_blank"
      >
        {'View source dashboard'}
      </EuiButton>
      <HostRiskInformation />
    </>
  );
};

HostRiskTabBodyComponent.displayName = 'HostRiskTabBodyComponent';

export const HostRiskTabBody = React.memo(HostRiskTabBodyComponent);

HostRiskTabBody.displayName = 'HostRiskTabBody';
