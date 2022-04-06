/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useMemo } from 'react';
import styled from 'styled-components';

import { TopHostScoreContributors } from '../../components/top_host_score_contributors';
import { HostsComponentsQueryProps } from './types';
import * as i18n from '../translations';
import { useRiskyHostsDashboardButtonHref } from '../../../overview/containers/overview_risky_host_links/use_risky_hosts_dashboard_button_href';
import { HostRiskInformationButtonEmpty } from '../../components/host_risk_information';
import { HostRiskScoreQueryId, useHostRiskScore } from '../../../risk_score/containers';
import { buildHostNamesFilter } from '../../../../common/search_strategy';
import { useQueryInspector } from '../../../common/components/page/manage_query';
import { RiskScoreOverTime } from '../../../common/components/risk_score_over_time';

const StyledEuiFlexGroup = styled(EuiFlexGroup)`
  margin-top: ${({ theme }) => theme.eui.paddingSizes.l};
`;

const QUERY_ID = HostRiskScoreQueryId.HOST_RISK_SCORE_OVER_TIME;

const HostRiskTabBodyComponent: React.FC<
  Pick<HostsComponentsQueryProps, 'startDate' | 'endDate' | 'setQuery' | 'deleteQuery'> & {
    hostName: string;
  }
> = ({ hostName, startDate, endDate, setQuery, deleteQuery }) => {
  const { buttonHref } = useRiskyHostsDashboardButtonHref(startDate, endDate);

  const timerange = useMemo(
    () => ({
      from: startDate,
      to: endDate,
    }),
    [startDate, endDate]
  );

  const [loading, { data, refetch, inspect }] = useHostRiskScore({
    filterQuery: hostName ? buildHostNamesFilter([hostName]) : undefined,
    onlyLatest: false,
    timerange,
  });

  useQueryInspector({
    queryId: QUERY_ID,
    loading,
    refetch,
    setQuery,
    deleteQuery,
    inspect,
  });

  return (
    <>
      <EuiFlexGroup direction="row">
        <EuiFlexItem grow={2}>
          <RiskScoreOverTime
            from={startDate}
            to={endDate}
            loading={loading}
            riskScore={data}
            queryId={QUERY_ID}
            title={i18n.HOST_RISK_SCORE_OVER_TIME}
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
