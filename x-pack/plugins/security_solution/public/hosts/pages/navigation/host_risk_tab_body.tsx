/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import { HostRiskScoreOverTime } from '../../components/host_score_over_time';
import { TopHostScoreContributors } from '../../components/top_host_score_contributors';
import { HostsComponentsQueryProps } from './types';
import * as i18n from '../translations';
import { useRiskyHostsDashboardButtonHref } from '../../../overview/containers/overview_risky_host_links/use_risky_hosts_dashboard_button_href';
import { HostRiskInformationButtonEmpty } from '../../components/host_risk_information';

const StyledEuiFlexGroup = styled(EuiFlexGroup)`
  margin-top: ${({ theme }) => theme.eui.paddingSizes.l};
`;

const HostRiskTabBodyComponent: React.FC<
  Pick<HostsComponentsQueryProps, 'startDate' | 'endDate' | 'setQuery' | 'deleteQuery'> & {
    hostName: string;
  }
> = ({ hostName, startDate, endDate, setQuery, deleteQuery }) => {
  const { buttonHref } = useRiskyHostsDashboardButtonHref(startDate, endDate);

  return (
    <>
      <EuiFlexGroup direction="row">
        <EuiFlexItem grow={2}>
          <HostRiskScoreOverTime
            hostName={hostName}
            from={startDate}
            to={endDate}
            setQuery={setQuery}
            deleteQuery={deleteQuery}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <TopHostScoreContributors
            hostName={hostName}
            from={startDate}
            to={endDate}
            setQuery={setQuery}
            deleteQuery={deleteQuery}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <StyledEuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiButton
            href={buttonHref}
            isDisabled={!buttonHref}
            data-test-subj="risky-hosts-view-dashboard-button"
            target="_blank"
          >
            {i18n.VIEW_DASHBOARD_BUTTON}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <HostRiskInformationButtonEmpty />
        </EuiFlexItem>
      </StyledEuiFlexGroup>
    </>
  );
};

HostRiskTabBodyComponent.displayName = 'HostRiskTabBodyComponent';

export const HostRiskTabBody = React.memo(HostRiskTabBodyComponent);

HostRiskTabBody.displayName = 'HostRiskTabBody';
