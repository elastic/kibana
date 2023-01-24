/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import type { TooltipValue } from '@elastic/charts';
import {
  Chart,
  LineSeries,
  ScaleType,
  Settings,
  Axis,
  Position,
  AnnotationDomainType,
  LineAnnotation,
} from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingChart, EuiText, EuiPanel } from '@elastic/eui';
import styled from 'styled-components';
import { euiThemeVars } from '@kbn/ui-theme';
import { chartDefaultSettings, useTheme } from '../../../../common/components/charts/common';
import { useTimeZone } from '../../../../common/lib/kibana';
import { histogramDateTimeFormatter } from '../../../../common/components/utils';
import { HeaderSection } from '../../../../common/components/header_section';
import { InspectButton, InspectButtonContainer } from '../../../../common/components/inspect';
import * as i18n from './translations';
import { PreferenceFormattedDate } from '../../../../common/components/formatted_date';
import type { HostRiskScore, UserRiskScore } from '../../../../../common/search_strategy';
import { isUserRiskScore } from '../../../../../common/search_strategy';

export interface RiskScoreOverTimeProps {
  from: string;
  to: string;
  loading: boolean;
  riskScore?: Array<HostRiskScore | UserRiskScore>;
  queryId: string;
  title: string;
  toggleStatus: boolean;
  toggleQuery?: (status: boolean) => void;
}

const RISKY_THRESHOLD = 70;
const DEFAULT_CHART_HEIGHT = 250;

const StyledEuiText = styled(EuiText)`
  font-size: 9px;
  font-weight: ${({ theme }) => theme.eui.euiFontWeightSemiBold};
  margin-right: ${({ theme }) => theme.eui.euiSizeXS};
`;

const LoadingChart = styled(EuiLoadingChart)`
  display: block;
  text-align: center;
`;

export const scoreFormatter = (d: number) => Math.round(d).toString();

const RiskScoreOverTimeComponent: React.FC<RiskScoreOverTimeProps> = ({
  from,
  to,
  riskScore,
  loading,
  queryId,
  title,
  toggleStatus,
  toggleQuery,
}) => {
  const timeZone = useTimeZone();

  const dataTimeFormatter = useMemo(() => histogramDateTimeFormatter([from, to]), [from, to]);
  const headerFormatter = useCallback(
    (tooltip: TooltipValue) => <PreferenceFormattedDate value={tooltip.value} />,
    []
  );

  const theme = useTheme();

  const graphData = useMemo(
    () =>
      riskScore
        ?.map((data) => ({
          x: data['@timestamp'],
          y: (isUserRiskScore(data) ? data.user : data.host).risk.calculated_score_norm,
        }))
        .reverse() ?? [],
    [riskScore]
  );

  return (
    <InspectButtonContainer>
      <EuiPanel hasBorder data-test-subj="RiskScoreOverTime">
        <EuiFlexGroup gutterSize={'none'}>
          <EuiFlexItem grow={1}>
            <HeaderSection
              title={title}
              hideSubtitle
              toggleQuery={toggleQuery}
              toggleStatus={toggleStatus}
            />
          </EuiFlexItem>
          {toggleStatus && (
            <EuiFlexItem grow={false}>
              <InspectButton queryId={queryId} title={title} />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>

        {toggleStatus && (
          <EuiFlexGroup gutterSize="none" direction="column">
            <EuiFlexItem grow={1}>
              <div style={{ height: DEFAULT_CHART_HEIGHT }}>
                {loading ? (
                  <LoadingChart size="l" data-test-subj="RiskScoreOverTime-loading" />
                ) : (
                  <Chart>
                    <Settings
                      {...chartDefaultSettings}
                      theme={theme}
                      tooltip={{
                        headerFormatter,
                      }}
                    />
                    <Axis
                      id="bottom"
                      position={Position.Bottom}
                      tickFormat={dataTimeFormatter}
                      showGridLines
                      gridLine={{
                        strokeWidth: 1,
                        opacity: 1,
                        dash: [3, 5],
                      }}
                    />
                    <Axis
                      domain={{
                        min: 0,
                        max: 100,
                      }}
                      id="left"
                      position={Position.Left}
                      ticks={3}
                      style={{
                        tickLine: {
                          visible: false,
                        },
                        tickLabel: {
                          padding: 10,
                        },
                      }}
                    />
                    <LineSeries
                      id="RiskOverTime"
                      name={i18n.RISK_SCORE}
                      xScaleType={ScaleType.Time}
                      yScaleType={ScaleType.Linear}
                      xAccessor="x"
                      yAccessors={['y']}
                      timeZone={timeZone}
                      data={graphData}
                      tickFormat={scoreFormatter}
                    />
                    <LineAnnotation
                      id="RiskOverTime_annotation"
                      domainType={AnnotationDomainType.YDomain}
                      dataValues={[
                        {
                          dataValue: RISKY_THRESHOLD,
                          details: `${RISKY_THRESHOLD}`,
                          header: i18n.RISK_THRESHOLD,
                        },
                      ]}
                      markerPosition="left"
                      style={{
                        line: {
                          strokeWidth: 1,
                          stroke: euiThemeVars.euiColorDanger,
                          opacity: 1,
                        },
                      }}
                      marker={
                        <StyledEuiText color={euiThemeVars.euiColorDarkestShade}>
                          {i18n.RISKY}
                        </StyledEuiText>
                      }
                    />
                  </Chart>
                )}
              </div>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiPanel>
    </InspectButtonContainer>
  );
};

RiskScoreOverTimeComponent.displayName = 'RiskScoreOverTimeComponent';
export const RiskScoreOverTime = React.memo(RiskScoreOverTimeComponent);
RiskScoreOverTime.displayName = 'RiskScoreOverTime';
