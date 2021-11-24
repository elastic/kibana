/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiTitle,
  EuiText,
} from '@elastic/eui';
import React from 'react';
import styled, { css } from 'styled-components';
import { euiLightVars } from '@kbn/ui-shared-deps-src/theme';
import { getEmptyTagValue } from '../../../../common/components/empty_value';
import { InspectButtonContainer, InspectButton } from '../../../../common/components/inspect';

import { HostsKpiBaseComponentLoader } from '../common';
import { HostsKpiProps } from '../types';
import * as i18n from './translations';

// TODO implement it
const useRiskyHosts = ({ filterQuery, endDate, indexNames, skip = false, startDate }) => {
  const riskyHostsResponse = { critical: 7, high: 5 };
  return [false, { refetch: () => undefined, id: 'id123', inspect: {}, data: riskyHostsResponse }];
};

export enum HostRiskSeverity {
  unknown = 'Unknown',
  low = 'Low',
  moderate = 'Moderate',
  high = 'High',
  critical = 'Critical',
}

const HOST_RISK_SEVERITY_COLOUR = {
  Unknown: euiLightVars.euiColorMediumShade,
  Low: euiLightVars.euiColorVis0,
  Moderate: euiLightVars.euiColorWarning,
  High: euiLightVars.euiColorVis9_behindText,
  Critical: euiLightVars.euiColorDanger,
};

const HostRiskBadge = styled.div<{ $severity: HostRiskSeverity }>`
  ${({ theme, $severity }) => css`
    width: fit-content;
    padding-right: ${theme.eui.paddingSizes.s};
    padding-left: ${theme.eui.paddingSizes.xs};

    ${($severity === 'Critical' || $severity === 'High') &&
    css`
      background-color: #bd271e33; // TODO what about this color?

      border-radius: 999px; // pill shaped
    `};
  `}
`;

const HostRisk: React.FC<{ severity: HostRiskSeverity }> = ({ severity }) => (
  <HostRiskBadge color={euiLightVars.euiColorDanger} $severity={severity}>
    <EuiHealth color={HOST_RISK_SEVERITY_COLOUR[severity]}>{severity}</EuiHealth>
  </HostRiskBadge>
);

const HostCount = styled(EuiText)`
  font-weight: bold;
`;
HostCount.displayName = 'HostCount';

const RiskyHostsComponent: React.FC<HostsKpiProps> = ({
  filterQuery,
  from,
  indexNames,
  to,
  narrowDateRange,
  setQuery,
  skip,
}) => {
  // TODO WHEN TEXT IS TOO BIG the panel expands. MAX WIDTH FOR THIS? WHERE To DEFINE IT?
  const description = 'Risky Hosts';

  // TODO IMPLEMENT SERVER AND LOAD DATA FROM IT
  const [loading, { refetch, id, inspect, data }] = useRiskyHosts({
    filterQuery,
    endDate: to,
    indexNames,
    startDate: from,
    skip,
  });

  if (loading) {
    return <HostsKpiBaseComponentLoader />;
  }

  const totalValue = data.critical + data.critical;
  return (
    <InspectButtonContainer>
      <EuiPanel hasBorder>
        <EuiFlexGroup gutterSize={'none'}>
          <EuiFlexItem>
            <EuiTitle size="xxxs">
              <h6>{description}</h6>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <InspectButton queryId={id} title={`KPI ${description}`} />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type={'alert'} color={'#343741'} size="l" data-test-subj="stat-icon" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle className="eui-textTruncate">
                  <p data-test-subj="stat-title">
                    {totalValue != null ? totalValue.toLocaleString() : getEmptyTagValue()}{' '}
                    {i18n.RISKY_HOSTS}
                  </p>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiHorizontalRule />
        <EuiFlexGroup direction="column" gutterSize="l" responsive={false}>
          {/* <EuiSpacer size="s" /> */}
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem style={{ minWidth: '80px' }} grow={false}>
                <HostRisk severity={HostRiskSeverity.critical} />
              </EuiFlexItem>
              <EuiFlexItem>
                <HostCount size="m">{i18n.HOSTS_COUNT(data.critical)}</HostCount>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem style={{ minWidth: '80px' }} grow={false}>
                <HostRisk severity={HostRiskSeverity.high} />
              </EuiFlexItem>
              <EuiFlexItem>
                <HostCount size="m">{i18n.HOSTS_COUNT(data.high)}</HostCount>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </InspectButtonContainer>
  );
};

export const RiskyHosts = React.memo(RiskyHostsComponent);
