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
import { ApmFetchDataResponse } from '../../../../typings';
import { formatStatValue } from '../../../../utils/format_stat_value';
import { ChartContainer } from '../../chart_container';
import { onBrushEnd } from '../helper';

interface Props {
  startTime?: string;
  endTime?: string;
  bucketSize?: string;
}

export const APMSection = ({ startTime, endTime, bucketSize }: Props) => {
  const theme = useContext(ThemeContext);
  const history = useHistory();

  const { data, status } = useFetcher(() => {
    if (startTime && endTime && bucketSize) {
      return getDataHandler('apm')?.fetchData({ startTime, endTime, bucketSize });
    }
  }, [startTime, endTime, bucketSize]);

  const transactionSeries = data?.series.transactions;

  const min = moment.utc(startTime).valueOf();
  const max = moment.utc(endTime).valueOf();

  const formatter = niceTimeFormatter([min, max]);

  const getSerieColor = (color?: string) => {
    if (color) {
      return color;
    }
  };

  const isLoading = status === FETCH_STATUS.LOADING;

  return (
    <SectionContainer
      minHeight={296}
      title={data?.title || 'APM'}
      subtitle={i18n.translate('xpack.observability.overview.chart.apm.subtitle', {
        defaultMessage: 'Summary',
      })}
      appLink={data?.appLink}
    >
      <EuiFlexGroup>
        {data &&
          Object.keys(data.stats).map((key) => {
            const stat = data?.stats[key as keyof ApmFetchDataResponse['stats']];
            return (
              <EuiFlexItem key={key} grow={false}>
                <EuiStat
                  title={formatStatValue(stat)}
                  description={stat.label}
                  titleSize="s"
                  isLoading={isLoading}
                />
              </EuiFlexItem>
            );
          })}
      </EuiFlexGroup>
      <ChartContainer height={177} isLoading={isLoading}>
        <Chart size={{ height: 177 }}>
          <Settings
            onBrushEnd={({ x }) => onBrushEnd({ x, history })}
            theme={theme.darkMode ? DARK_THEME : LIGHT_THEME}
            showLegend={true}
            legendPosition="bottom"
            xDomain={{ min, max }}
          />
          {transactionSeries?.coordinates && (
            <>
              <BarSeries
                id="transactions"
                name="Transactions"
                data={transactionSeries.coordinates}
                xScaleType={ScaleType.Time}
                yScaleType={ScaleType.Linear}
                xAccessor={'x'}
                yAccessors={['y']}
                color={getSerieColor(transactionSeries.color)}
              />
              <Axis
                id="y-axis"
                position={Position.Left}
                showGridLines
                tickFormat={(d) => numeral(d).format('0a')}
              />
              <Axis id="x-axis" position={Position.Bottom} tickFormat={formatter} />
            </>
          )}
        </Chart>
      </ChartContainer>
    </SectionContainer>
  );
};
