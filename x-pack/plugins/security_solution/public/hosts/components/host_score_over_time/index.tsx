/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import {
  Chart,
  LineSeries,
  ScaleType,
  Settings,
  Axis,
  Position,
  AnnotationDomainType,
  LineAnnotation,
  TooltipValue,
} from '@elastic/charts';
import { euiThemeVars } from '@kbn/ui-theme';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingChart, EuiText, EuiPanel } from '@elastic/eui';
import styled from 'styled-components';
import { chartDefaultSettings, useTheme } from '../../../common/components/charts/common';
import { useTimeZone } from '../../../common/lib/kibana';
import { histogramDateTimeFormatter } from '../../../common/components/utils';
import { HeaderSection } from '../../../common/components/header_section';
import { InspectButton, InspectButtonContainer } from '../../../common/components/inspect';
import * as i18n from './translations';
import { PreferenceFormattedDate } from '../../../common/components/formatted_date';
import { useQueryInspector } from '../../../common/components/page/manage_query';
import { HostsComponentsQueryProps } from '../../pages/navigation/types';
import { buildHostNamesFilter } from '../../../../common/search_strategy/security_solution/risk_score';
import { HostRiskScoreQueryId, useHostRiskScore } from '../../../risk_score/containers';

export interface HostRiskScoreOverTimeProps
  extends Pick<HostsComponentsQueryProps, 'setQuery' | 'deleteQuery'> {
  hostName: string;
  from: string;
  to: string;
}

const RISKY_THRESHOLD = 70;
const DEFAULT_CHART_HEIGHT = 250;
const QUERY_ID = HostRiskScoreQueryId.HOST_RISK_SCORE_OVER_TIME;

const StyledEuiText = styled(EuiText)`
  font-size: 9px;
  font-weight: ${({ theme }) => theme.eui.euiFontWeightSemiBold};
  margin-right: ${({ theme }) => theme.eui.paddingSizes.xs};
`;

const LoadingChart = styled(EuiLoadingChart)`
  display: block;
  text-align: center;
`;

const HostRiskScoreOverTimeComponent: React.FC<HostRiskScoreOverTimeProps> = ({
  hostName,
  from,
  to,
  setQuery,
  deleteQuery,
}) => {
  const timeZone = useTimeZone();

  const dataTimeFormatter = useMemo(() => histogramDateTimeFormatter([from, to]), [from, to]);
  const scoreFormatter = useCallback((d: number) => Math.round(d).toString(), []);
  const headerFormatter = useCallback(
    (tooltip: TooltipValue) => <PreferenceFormattedDate value={tooltip.value} />,
    []
  );

  const timerange = useMemo(
    () => ({
      from,
      to,
    }),
    [from, to]
  );
  const theme = useTheme();

  const [loading, { data, refetch, inspect }] = useHostRiskScore({
    filterQuery: hostName ? buildHostNamesFilter([hostName]) : undefined,
    onlyLatest: false,
    timerange,
  });

  const graphData = useMemo(
    () =>
      data
        ?.map((hostRisk) => ({
          x: hostRisk['@timestamp'],
          y: hostRisk.risk_stats.risk_score,
        }))
        .reverse() ?? [],
    [data]
  );

  useQueryInspector({
    queryId: QUERY_ID,
    loading,
    refetch,
    setQuery,
    deleteQuery,
    inspect,
  });

  return (
    <InspectButtonContainer>
      <EuiPanel hasBorder data-test-subj="hostRiskScoreOverTime">
        <EuiFlexGroup gutterSize={'none'}>
          <EuiFlexItem grow={1}>
            <HeaderSection title={i18n.HOST_RISK_SCORE_OVER_TIME} hideSubtitle />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <InspectButton queryId={QUERY_ID} title={i18n.HOST_RISK_SCORE_OVER_TIME} />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiFlexGroup gutterSize="none" direction="column">
          <EuiFlexItem grow={1}>
            <div style={{ height: DEFAULT_CHART_HEIGHT }}>
              {loading ? (
                <LoadingChart size="l" data-test-subj="HostRiskScoreOverTime-loading" />
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
                    id={'HostRiskOverTime'}
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
                    id="HostRiskOverTime_annotation"
                    domainType={AnnotationDomainType.YDomain}
                    dataValues={[
                      {
                        dataValue: RISKY_THRESHOLD,
                        details: `${RISKY_THRESHOLD}`,
                        header: i18n.HOST_RISK_THRESHOLD,
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
      </EuiPanel>
    </InspectButtonContainer>
  );
};

HostRiskScoreOverTimeComponent.displayName = 'HostRiskScoreOverTimeComponent';
export const HostRiskScoreOverTime = React.memo(HostRiskScoreOverTimeComponent);
HostRiskScoreOverTime.displayName = 'HostRiskScoreOverTime';
