/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Axis, BarSeries, niceTimeFormatter, Position, ScaleType, Settings } from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import React, { useContext } from 'react';
import { useHistory } from 'react-router-dom';
import { ThemeContext } from 'styled-components';
import { SectionContainer } from '../';
import { getDataHandler } from '../../../../data_handler';
import { useChartTheme } from '../../../../hooks/use_chart_theme';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { ChartContainer } from '../../chart_container';
import { StyledStat } from '../../styled_stat';
import { onBrushEnd } from '../helper';

interface Props {
  absoluteTime: { start?: number; end?: number };
  relativeTime: { start: string; end: string };
  bucketSize?: string;
}

function formatTpm(value?: number) {
  return numeral(value).format('0.00a');
}

export const APMSection = ({ absoluteTime, relativeTime, bucketSize }: Props) => {
  const theme = useContext(ThemeContext);
  const history = useHistory();

  const { start, end } = absoluteTime;
  const { data, status } = useFetcher(() => {
    if (start && end && bucketSize) {
      return getDataHandler('apm')?.fetchData({
        absoluteTime: { start, end },
        relativeTime,
        bucketSize,
      });
    }
  }, [start, end, bucketSize]);

  const { appLink, stats, series } = data || {};

  const min = moment.utc(absoluteTime.start).valueOf();
  const max = moment.utc(absoluteTime.end).valueOf();

  const formatter = niceTimeFormatter([min, max]);

  const isLoading = status === FETCH_STATUS.LOADING;

  const transactionsColor = theme.eui.euiColorVis1;

  return (
    <SectionContainer
      title={i18n.translate('xpack.observability.overview.apm.title', {
        defaultMessage: 'APM',
      })}
      appLink={{
        href: appLink,
        label: i18n.translate('xpack.observability.overview.apm.appLink', {
          defaultMessage: 'View in app',
        }),
      }}
      hasError={status === FETCH_STATUS.FAILURE}
    >
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <StyledStat
            title={numeral(stats?.services.value).format('0a')}
            description={i18n.translate('xpack.observability.overview.apm.services', {
              defaultMessage: 'Services',
            })}
            isLoading={isLoading}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <StyledStat
            title={formatTpm(stats?.transactions.value)}
            description={i18n.translate('xpack.observability.overview.apm.transactionsPerMinute', {
              defaultMessage: 'Transactions per minute',
            })}
            isLoading={isLoading}
            color={transactionsColor}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <ChartContainer isInitialLoad={isLoading && !data}>
        <Settings
          onBrushEnd={({ x }) => onBrushEnd({ x, history })}
          theme={useChartTheme()}
          showLegend={false}
          xDomain={{ min, max }}
        />
        {series?.transactions.coordinates && (
          <>
            <BarSeries
              id="transactions"
              name="Transactions"
              data={series?.transactions.coordinates}
              xScaleType={ScaleType.Time}
              yScaleType={ScaleType.Linear}
              xAccessor={'x'}
              yAccessors={['y']}
              color={transactionsColor}
            />
            <Axis
              id="y-axis"
              position={Position.Left}
              showGridLines
              tickFormat={(value) => `${formatTpm(value)} tpm`}
            />
            <Axis id="x-axis" position={Position.Bottom} tickFormat={formatter} />
          </>
        )}
      </ChartContainer>
    </SectionContainer>
  );
};
