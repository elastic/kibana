/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiLoadingSpinner,
  EuiTitle,
  EuiText,
} from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import { euiLightVars } from '@kbn/ui-theme';
import {
  InspectButton,
  BUTTON_CLASS as INPECT_BUTTON_CLASS,
} from '../../../../common/components/inspect';

import * as i18n from './translations';

import { useInspectQuery } from '../../../../common/hooks/use_inspect_query';
import { useErrorToast } from '../../../../common/hooks/use_error_toast';

import {
  HostRiskInformationButtonIcon,
  HOST_RISK_INFO_BUTTON_CLASS,
} from '../../host_risk_information';
import { HoverVisibilityContainer } from '../../../../common/components/hover_visibility_container';
import { KpiRiskScoreStrategyResponse, RiskSeverity } from '../../../../../common/search_strategy';
import { RiskScore } from '../../../../common/components/severity/common';

const KpiBaseComponentLoader: React.FC = () => (
  <EuiFlexGroup justifyContent="center" alignItems="center" data-test-subj="hostsKpiLoader">
    <EuiFlexItem grow={false}>
      <EuiLoadingSpinner size="xl" />
    </EuiFlexItem>
  </EuiFlexGroup>
);
const QUERY_ID = 'hostsKpiRiskyHostsQuery';

const HostCount = styled(EuiText)`
  font-weight: bold;
`;
HostCount.displayName = 'HostCount';

const StatusTitle = styled(EuiTitle)`
  text-transform: lowercase;
`;

const RiskScoreContainer = styled(EuiFlexItem)`
  min-width: 80px;
`;

/**
 * FUTURE ENGINEER: This is a host risk card for the host page.
 * Due to not being able to apply KQL,
 * we decided not to go forward with this for 8.1
 * saving the code for future implementation
 */
const RiskyHostsComponent: React.FC<{
  error: unknown;
  loading: boolean;
  data?: KpiRiskScoreStrategyResponse;
}> = ({ error, loading, data }) => {
  useInspectQuery(QUERY_ID, loading, data);
  useErrorToast(i18n.ERROR_TITLE, error);

  if (loading) {
    return <KpiBaseComponentLoader />;
  }

  const criticalRiskCount = data?.kpiRiskScore.Critical ?? 0;
  const hightlRiskCount = data?.kpiRiskScore.High ?? 0;

  const totalCount = criticalRiskCount + hightlRiskCount;

  return (
    <HoverVisibilityContainer targetClassNames={[INPECT_BUTTON_CLASS, HOST_RISK_INFO_BUTTON_CLASS]}>
      <EuiPanel hasBorder data-test-subj="risky-hosts">
        <EuiFlexGroup gutterSize={'none'}>
          <EuiFlexItem>
            <EuiTitle size="xxxs">
              <h6>{i18n.RISKY_HOSTS_TITLE}</h6>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem>
                <HostRiskInformationButtonIcon />
              </EuiFlexItem>
              {data?.inspect && (
                <EuiFlexItem>
                  <InspectButton queryId={QUERY_ID} title={i18n.INSPECT_RISKY_HOSTS} />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type="alert" color={euiLightVars.euiColorDarkestShade} size="l" />
              </EuiFlexItem>
              <EuiFlexItem>
                <StatusTitle className="eui-textTruncate" data-test-subj="riskyHostsTotal">
                  <p>{i18n.RISKY_HOSTS_DESCRIPTION(totalCount, totalCount.toLocaleString())}</p>
                </StatusTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiHorizontalRule />
        <EuiFlexGroup direction="column" gutterSize="l" responsive={false}>
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <RiskScoreContainer grow={false}>
                <RiskScore severity={RiskSeverity.critical} />
              </RiskScoreContainer>
              <EuiFlexItem>
                <HostCount size="m" data-test-subj="riskyHostsCriticalQuantity">
                  {i18n.HOSTS_COUNT(criticalRiskCount)}
                </HostCount>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <RiskScoreContainer grow={false}>
                <RiskScore severity={RiskSeverity.high} />
              </RiskScoreContainer>
              <EuiFlexItem>
                <HostCount size="m" data-test-subj="riskyHostsHighQuantity">
                  {i18n.HOSTS_COUNT(hightlRiskCount)}
                </HostCount>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </HoverVisibilityContainer>
  );
};

export const RiskyHosts = React.memo(RiskyHostsComponent);
