/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { AreaSeries, ScaleType, Settings } from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem, EuiProgress, EuiSpacer } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import React, { useContext } from 'react';
import styled, { ThemeContext } from 'styled-components';
import { SectionContainer } from '../';
import { getDataHandler } from '../../../../data_handler';
import { useChartTheme } from '../../../../hooks/use_chart_theme';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { Series } from '../../../../typings';
import { ChartContainer } from '../../chart_container';
import { StyledStat } from '../../styled_stat';

interface Props {
  startTime?: string;
  endTime?: string;
  bucketSize?: string;
}

/**
 * EuiProgress doesn't support custom color, when it does this component can be removed.
 */
const StyledProgress = styled.div<{ color?: string }>`
  progress {
    &.euiProgress--native {
      &::-webkit-progress-value {
        background-color: ${(props) => props.color};
      }

      &::-moz-progress-bar {
        background-color: ${(props) => props.color};
      }
    }

    &.euiProgress--indeterminate {
      &:before {
        background-color: ${(props) => props.color};
      }
    }
  }
`;

export const MetricsSection = ({ startTime, endTime, bucketSize }: Props) => {
  const theme = useContext(ThemeContext);
  const { data, status } = useFetcher(() => {
    if (startTime && endTime && bucketSize) {
      return getDataHandler('infra_metrics')?.fetchData({ startTime, endTime, bucketSize });
    }
  }, [startTime, endTime, bucketSize]);

  const isLoading = status === FETCH_STATUS.LOADING;

  const { title = 'Metrics', appLink, stats, series } = data || {};

  const cpuColor = theme.eui.euiColorVis7;
  const memoryColor = theme.eui.euiColorVis0;
  const inboundTrafficColor = theme.eui.euiColorVis3;
  const outboundTrafficColor = theme.eui.euiColorVis2;

  return (
    <SectionContainer
      minHeight={135}
      title={title}
      appLink={appLink}
      hasError={status === FETCH_STATUS.FAILURE}
    >
      <EuiFlexGroup>
        <EuiFlexItem>
          <StyledStat
            title={numeral(stats?.hosts.value).format('0a')}
            description={i18n.translate('xpack.observability.overview.metrics.hosts', {
              defaultMessage: 'Hosts',
            })}
            isLoading={isLoading}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <StyledStat
            title={numeral(stats?.cpu.value).format('0.0%')}
            description={i18n.translate('xpack.observability.overview.metrics.cpuUsage', {
              defaultMessage: 'CPU Usage',
            })}
            isLoading={isLoading}
            color={cpuColor}
          >
            <EuiSpacer size="s" />
            <StyledProgress color={cpuColor}>
              <EuiProgress
                value={stats?.cpu.value}
                max={1}
                style={{ width: '100px' }}
                color="accent"
              />
            </StyledProgress>
          </StyledStat>
        </EuiFlexItem>
        <EuiFlexItem>
          <StyledStat
            title={numeral(stats?.memory.value).format('0.0%')}
            description={i18n.translate('xpack.observability.overview.metrics.memoryUsage', {
              defaultMessage: 'Memory usage',
            })}
            isLoading={isLoading}
            color={memoryColor}
          >
            <EuiSpacer size="s" />
            <StyledProgress color={memoryColor}>
              <EuiProgress value={stats?.memory.value} max={1} style={{ width: '100px' }} />
            </StyledProgress>
          </StyledStat>
        </EuiFlexItem>
        <EuiFlexItem>
          <StyledStat
            title={`${numeral(stats?.inboundTraffic.value).format('0.0b')}/s`}
            description={i18n.translate('xpack.observability.overview.metrics.inboundTraffic', {
              defaultMessage: 'Inbound traffic',
            })}
            isLoading={isLoading}
            color={inboundTrafficColor}
          >
            <AreaChart
              serie={series?.inboundTraffic}
              isLoading={isLoading}
              color={inboundTrafficColor}
            />
          </StyledStat>
        </EuiFlexItem>
        <EuiFlexItem>
          <StyledStat
            title={`${numeral(stats?.outboundTraffic.value).format('0.0b')}/s`}
            description={i18n.translate('xpack.observability.overview.metrics.outboundTraffic', {
              defaultMessage: 'Outbound traffic',
            })}
            isLoading={isLoading}
            color={outboundTrafficColor}
          >
            <AreaChart
              serie={series?.outboundTraffic}
              isLoading={isLoading}
              color={outboundTrafficColor}
            />
          </StyledStat>
        </EuiFlexItem>
      </EuiFlexGroup>
    </SectionContainer>
  );
};

const AreaChart = ({
  serie,
  isLoading,
  color,
}: {
  serie?: Series;
  isLoading: boolean;
  color: string;
}) => {
  const chartTheme = useChartTheme();

  return (
    <ChartContainer height={30} isInitialLoad={isLoading && !serie} iconSize="m">
      <Settings theme={chartTheme} showLegend={false} tooltip="none" />
      {serie && (
        <AreaSeries
          id="area"
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor={'x'}
          yAccessors={['y']}
          data={serie.coordinates}
          color={color}
        />
      )}
    </ChartContainer>
  );
};
