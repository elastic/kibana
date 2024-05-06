/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import type { TooltipHeaderFormatter } from '@elastic/charts';
import {
  Chart,
  LineSeries,
  ScaleType,
  Settings,
  Axis,
  Position,
  AnnotationDomainType,
  LineAnnotation,
  Tooltip,
} from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingChart, EuiText, EuiPanel } from '@elastic/eui';
import styled from 'styled-components';
import { euiThemeVars } from '@kbn/ui-theme';
import { i18n } from '@kbn/i18n';
import { chartDefaultSettings, useThemes } from '../../../common/components/charts/common';
import { useTimeZone } from '../../../common/lib/kibana';
import { histogramDateTimeFormatter } from '../../../common/components/utils';
import { HeaderSection } from '../../../common/components/header_section';
import { InspectButton, InspectButtonContainer } from '../../../common/components/inspect';
import * as translations from './translations';
import { PreferenceFormattedDate } from '../../../common/components/formatted_date';
import type {
  HostRiskScore,
  RiskScoreEntity,
  UserRiskScore,
} from '../../../../common/search_strategy';
import { isUserRiskScore } from '../../../../common/search_strategy';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { VisualizationEmbeddable } from '../../../common/components/visualization_actions/visualization_embeddable';
import { getRiskScoreOverTimeAreaAttributes } from '../../lens_attributes/risk_score_over_time_area';

export interface RiskScoreOverTimeProps {
  from: string;
  to: string;
  loading: boolean;
  riskScore?: Array<HostRiskScore | UserRiskScore>;
  riskEntity: RiskScoreEntity;
  queryId: string;
  title: string;
  toggleStatus: boolean;
  toggleQuery?: (status: boolean) => void;
}

const RISKY_THRESHOLD = 70;
const DEFAULT_CHART_HEIGHT = 250;
const CHART_HEIGHT = 180;
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
  riskEntity,
  title,
  toggleStatus,
  toggleQuery,
}) => {
  const timeZone = useTimeZone();

  const dataTimeFormatter = useMemo(() => histogramDateTimeFormatter([from, to]), [from, to]);
  const headerFormatter = useCallback<TooltipHeaderFormatter>(
    ({ value }) => <PreferenceFormattedDate value={value} />,
    []
  );

  const { baseTheme, theme } = useThemes();
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
  const spaceId = useSpaceId();
  const isChartEmbeddablesEnabled = useIsExperimentalFeatureEnabled('chartEmbeddablesEnabled');
  const timerange = useMemo(
    () => ({
      from,
      to,
    }),
    [from, to]
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
          {toggleStatus && !isChartEmbeddablesEnabled && (
            <EuiFlexItem grow={false}>
              <InspectButton queryId={queryId} title={title} />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>

        {toggleStatus && (
          <EuiFlexGroup gutterSize="none" direction="column">
            <EuiFlexItem grow={1}>
              {isChartEmbeddablesEnabled && spaceId ? (
                <VisualizationEmbeddable
                  applyGlobalQueriesAndFilters={false}
                  timerange={timerange}
                  getLensAttributes={getRiskScoreOverTimeAreaAttributes}
                  stackByField={riskEntity}
                  id={`${queryId}-embeddable`}
                  height={CHART_HEIGHT}
                  extraOptions={{ spaceId }}
                />
              ) : (
                <div style={{ height: DEFAULT_CHART_HEIGHT }}>
                  {loading ? (
                    <LoadingChart size="l" data-test-subj="RiskScoreOverTime-loading" />
                  ) : (
                    <Chart>
                      <Tooltip headerFormatter={headerFormatter} />
                      <Settings
                        {...chartDefaultSettings}
                        baseTheme={baseTheme}
                        theme={theme}
                        locale={i18n.getLocale()}
                      />
                      <Axis
                        id="bottom"
                        position={Position.Bottom}
                        tickFormat={dataTimeFormatter}
                        gridLine={{
                          visible: true,
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
                        name={translations.RISK_SCORE}
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
                            header: translations.RISK_THRESHOLD,
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
                            {translations.RISKY}
                          </StyledEuiText>
                        }
                      />
                    </Chart>
                  )}
                </div>
              )}
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
