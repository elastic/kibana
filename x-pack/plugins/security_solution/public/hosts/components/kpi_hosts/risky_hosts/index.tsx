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
  transparentize,
} from '@elastic/eui';
import React, { useEffect } from 'react';
import styled, { css } from 'styled-components';
import { euiLightVars } from '@kbn/ui-shared-deps-src/theme';
import { InspectButtonContainer, InspectButton } from '../../../../common/components/inspect';

import { HostsKpiBaseComponentLoader } from '../common';
import type { HostsKpiProps } from '../types';
import * as i18n from './translations';
import { useRiskyHostsComplete } from '../../../containers/kpi_hosts/risky_hosts';
import { useKibana } from '../../../../common/lib/kibana';
import { getHostRiskIndex } from '../../../../helpers';
import { HostRiskSeverity } from '../../../../../common/search_strategy/security_solution/hosts/kpi/risky_hosts';

import { useInspectQuery } from '../../../../common/hooks/use_inspect_query';
import { useErrorToast } from '../../../../common/hooks/use_error_toast';

const QUERY_ID = 'hostsKpiRiskyHostsQuery';

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
      background-color: ${transparentize(theme.eui.euiColorDanger, 0.2)};
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

const StatusTitle = styled(EuiTitle)`
  text-transform: lowercase;
`;

const RiskyHostsComponent: React.FC<Pick<HostsKpiProps, 'filterQuery' | 'from' | 'to' | 'skip'>> =
  ({ filterQuery, from, to, skip }) => {
    const { error, result: response, start, loading } = useRiskyHostsComplete();
    const { data, spaces } = useKibana().services;

    useEffect(() => {
      if (!skip) {
        spaces?.getActiveSpace().then((space) => {
          start({
            data,
            timerange: { to, from, interval: '' },
            filterQuery,
            defaultIndex: [getHostRiskIndex(space.id)],
          });
        });
      }
    }, [data, spaces, start, filterQuery, to, from, skip]);

    useInspectQuery(QUERY_ID, loading, response);
    useErrorToast(i18n.ERROR_TITLE, error);

    if (loading) {
      return <HostsKpiBaseComponentLoader />;
    }

    const criticalRiskCount = response?.riskyHosts.Critical ?? 0;
    const hightlRiskCount = response?.riskyHosts.High ?? 0;

    const totalCount = criticalRiskCount + hightlRiskCount;

    return (
      <InspectButtonContainer>
        <EuiPanel hasBorder>
          <EuiFlexGroup gutterSize={'none'}>
            <EuiFlexItem>
              <EuiTitle size="xxxs">
                <h6>{i18n.RISKY_HOSTS}</h6>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <InspectButton queryId={QUERY_ID} title={`KPI ${i18n.RISKY_HOSTS}`} />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiIcon type={'alert'} color={euiLightVars.euiColorDarkestShade} size="l" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <StatusTitle className="eui-textTruncate" data-test-subj="riskyHostsTotal">
                    <p>
                      {(totalCount ?? 0).toLocaleString()} {i18n.RISKY_HOSTS}
                    </p>
                  </StatusTitle>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiHorizontalRule />
          <EuiFlexGroup direction="column" gutterSize="l" responsive={false}>
            <EuiFlexItem>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem style={{ minWidth: '80px' }} grow={false}>
                  <HostRisk severity={HostRiskSeverity.critical} />
                </EuiFlexItem>
                <EuiFlexItem>
                  <HostCount size="m" data-test-subj="riskyHostsCriticalQuantity">
                    {i18n.HOSTS_COUNT(criticalRiskCount)}
                  </HostCount>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem style={{ minWidth: '80px' }} grow={false}>
                  <HostRisk severity={HostRiskSeverity.high} />
                </EuiFlexItem>
                <EuiFlexItem>
                  <HostCount size="m" data-test-subj="riskyHostsHighQuantity">
                    {i18n.HOSTS_COUNT(hightlRiskCount)}
                  </HostCount>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </InspectButtonContainer>
    );
  };

export const RiskyHosts = React.memo(RiskyHostsComponent);
