/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';

import { EuiStat, EuiFlexItem, EuiFlexGroup, EuiToolTip, EuiBadge } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { euiThemeVars } from '@kbn/ui-theme';
import { DEFAULT_NUMBER_FORMAT } from '../../../../../common/constants';
import { useUiSetting$ } from '../../../../common/lib/kibana';
import type { TimelineKpiStrategyResponse } from '../../../../../common/search_strategy';
import { getEmptyValue } from '../../../../common/components/empty_value';
import * as i18n from './translations';

const NoWrapEuiStat = styled(EuiStat)`
  & .euiStat__description {
    white-space: nowrap;
  }
`;

export const StatsContainer = styled.span`
  font-size: ${euiThemeVars.euiFontSizeXS};
  font-weight: ${euiThemeVars.euiFontWeightSemiBold};
  /* border-right: ${euiThemeVars.euiBorderThin}; */
  padding-right: 16px;
  .smallDot {
    width: 3px !important;
    display: inline-block;
  }
  .euiBadge__text {
    text-align: center;
    width: 100%;
  }
`;

export const TimelineKPIs2 = React.memo(
  ({ kpis, isLoading }: { kpis: TimelineKpiStrategyResponse | null; isLoading: boolean }) => {
    const kpiFormat = '0,0.[000]a';
    const [defaultNumberFormat] = useUiSetting$<string>(DEFAULT_NUMBER_FORMAT);
    const formattedKpis = useMemo(() => {
      return {
        process: kpis === null ? getEmptyValue() : numeral(kpis.processCount).format(kpiFormat),
        user: kpis === null ? getEmptyValue() : numeral(kpis.userCount).format(kpiFormat),
        host: kpis === null ? getEmptyValue() : numeral(kpis.hostCount).format(kpiFormat),
        sourceIp: kpis === null ? getEmptyValue() : numeral(kpis.sourceIpCount).format(kpiFormat),
        destinationIp:
          kpis === null ? getEmptyValue() : numeral(kpis.destinationIpCount).format(kpiFormat),
      };
    }, [kpis]);

    const formattedKpiToolTips = useMemo(() => {
      return {
        process: numeral(kpis?.processCount).format(defaultNumberFormat),
        user: numeral(kpis?.userCount).format(defaultNumberFormat),
        host: numeral(kpis?.hostCount).format(defaultNumberFormat),
        sourceIp: numeral(kpis?.sourceIpCount).format(defaultNumberFormat),
        destinationIp: numeral(kpis?.destinationIpCount).format(defaultNumberFormat),
      };
    }, [kpis, defaultNumberFormat]);

    const getColor = useCallback((count) => {
      if (count === 0) {
        return 'danger';
      }
      return 'hollow';
    }, []);

    if (!kpis) return null;

    return (
      <EuiFlexGroup wrap data-test-subj="siem-timeline-kpis">
        <EuiFlexItem grow={false}>
          <StatsContainer>
            {`${i18n.PROCESS_KPI_TITLE} : `}
            <EuiToolTip position="left" content={formattedKpiToolTips.process}>
              <EuiBadge
                color={getColor(kpis?.processCount ?? 0)}
                data-test-subj={i18n.PROCESS_KPI_TITLE}
              >
                {formattedKpis.process}
              </EuiBadge>
            </EuiToolTip>
          </StatsContainer>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <StatsContainer>
            {`${i18n.USER_KPI_TITLE} : `}
            <EuiToolTip position="left" content={formattedKpiToolTips.user}>
              <EuiBadge color={getColor(kpis?.userCount ?? 0)} data-test-subj={i18n.USER_KPI_TITLE}>
                {formattedKpis.user}
              </EuiBadge>
            </EuiToolTip>
          </StatsContainer>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <StatsContainer>
            {`${i18n.HOST_KPI_TITLE} : `}
            <EuiToolTip position="left" content={formattedKpiToolTips.host}>
              <EuiBadge color={getColor(kpis?.hostCount ?? 0)} data-test-subj={i18n.HOST_KPI_TITLE}>
                {formattedKpis.host}
              </EuiBadge>
            </EuiToolTip>
          </StatsContainer>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <StatsContainer>
            {`${i18n.SOURCE_IP_KPI_TITLE} : `}
            <EuiToolTip position="left" content={formattedKpiToolTips.sourceIp}>
              <EuiBadge
                color={getColor(kpis?.sourceIpCount ?? 0)}
                data-test-subj={i18n.SOURCE_IP_KPI_TITLE}
              >
                {formattedKpis.sourceIp}
              </EuiBadge>
            </EuiToolTip>
          </StatsContainer>
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ minWidth: 100 }}>
          <StatsContainer>
            {`${i18n.SOURCE_IP_KPI_TITLE} : `}
            <EuiToolTip position="left" content={formattedKpiToolTips.destinationIp}>
              <EuiBadge
                color={getColor(kpis?.destinationIpCount ?? 0)}
                data-test-subj={i18n.DESTINATION_IP_KPI_TITLE}
              >
                {formattedKpis.destinationIp}
              </EuiBadge>
            </EuiToolTip>
          </StatsContainer>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

TimelineKPIs2.displayName = 'TimelineKPIs';
