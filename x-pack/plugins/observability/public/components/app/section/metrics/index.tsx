/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiProgress, EuiSpacer } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import React, { useContext } from 'react';
import styled, { ThemeContext } from 'styled-components';
import { SectionContainer } from '../';
import { getDataHandler } from '../../../../data_handler';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { useHasData } from '../../../../hooks/use_has_data';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { StyledStat } from '../../styled_stat';

interface Props {
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

export function MetricsSection({ bucketSize }: Props) {
  const theme = useContext(ThemeContext);
  const { forceUpdate, hasData } = useHasData();
  const { relativeStart, relativeEnd, absoluteStart, absoluteEnd } = useTimeRange();

  const { data, status } = useFetcher(
    () => {
      if (bucketSize) {
        return getDataHandler('infra_metrics')?.fetchData({
          absoluteTime: { start: absoluteStart, end: absoluteEnd },
          relativeTime: { start: relativeStart, end: relativeEnd },
          bucketSize,
        });
      }
    },
    // Absolute times shouldn't be used here, since it would refetch on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bucketSize, relativeStart, relativeEnd, forceUpdate]
  );

  if (!hasData.infra_metrics?.hasData) {
    return null;
  }

  const isLoading = status === FETCH_STATUS.LOADING;

  const { appLink, stats } = data || {};

  const cpuColor = theme.eui.euiColorVis7;
  const memoryColor = theme.eui.euiColorVis0;

  return (
    <SectionContainer
      title={i18n.translate('xpack.observability.overview.metrics.title', {
        defaultMessage: 'Metrics',
      })}
      appLink={{
        href: appLink,
        label: i18n.translate('xpack.observability.overview.metrics.appLink', {
          defaultMessage: 'View in app',
        }),
      }}
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
              defaultMessage: 'CPU usage',
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
      </EuiFlexGroup>
    </SectionContainer>
  );
}
