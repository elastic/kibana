/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Axis,
  BarSeries,
  Chart,
  DARK_THEME,
  LIGHT_THEME,
  niceTimeFormatter,
  Position,
  ScaleType,
  Settings,
} from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem, EuiStat } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import React, { useContext } from 'react';
import { useHistory } from 'react-router-dom';
import { ThemeContext } from 'styled-components';
import { SectionContainer } from '../';
import { getDataHandler } from '../../../../data_handler';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { ChartContainer } from '../../chart_container';
import { onBrushEnd } from '../helper';
import { StyledStat } from '../../styled_stat';

interface Props {
  startTime?: string;
  endTime?: string;
  bucketSize?: string;
}

function formatTransactionValue(value?: number) {
  return numeral(value).format('0.00a');
}

export const APMSection = ({ startTime, endTime, bucketSize }: Props) => {
  const theme = useContext(ThemeContext);
  const history = useHistory();

  const { data, status } = useFetcher(() => {
    if (startTime && endTime && bucketSize) {
      return getDataHandler('apm')?.fetchData({ startTime, endTime, bucketSize });
    }
  }, [startTime, endTime, bucketSize]);

  const { title = 'APM', appLink, stats, series } = data || {};

  const min = moment.utc(startTime).valueOf();
  const max = moment.utc(endTime).valueOf();

  const formatter = niceTimeFormatter([min, max]);

  const isLoading = status === FETCH_STATUS.LOADING;

  const transactionsColor = series?.transactions.color || theme.euiColorVis1;

  return (
    <SectionContainer
      minHeight={296}
      title={title || 'APM'}
      subtitle={i18n.translate('xpack.observability.overview.chart.apm.subtitle', {
        defaultMessage: 'Summary',
      })}
      appLink={appLink}
      hasError={status === FETCH_STATUS.FAILURE}
    >
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiStat
            title={numeral(stats?.services.value).format('0a')}
            description={stats?.services.label || ''}
            titleSize="s"
            isLoading={isLoading}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <StyledStat
            title={formatTransactionValue(stats?.transactions.value)}
            description={stats?.transactions.label || ''}
            titleSize="s"
            isLoading={isLoading}
            color={transactionsColor}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <ChartContainer height={177} isLoading={isLoading}>
        <Chart size={{ height: 177 }}>
          <Settings
            onBrushEnd={({ x }) => onBrushEnd({ x, history })}
            theme={theme.darkMode ? DARK_THEME : LIGHT_THEME}
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
                tickFormat={(value) => `${numeral(value).format('0.00a')} tpm`}
              />
              <Axis id="x-axis" position={Position.Bottom} tickFormat={formatter} />
            </>
          )}
        </Chart>
      </ChartContainer>
    </SectionContainer>
  );
};
