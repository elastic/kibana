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
  Settings,
} from '@elastic/charts';
import d3 from 'd3';
import { EuiFlexGroup, EuiFlexItem, EuiStat } from '@elastic/eui';
import numeral from '@elastic/numeral';
import React, { useContext } from 'react';
import { ThemeContext } from 'styled-components';
import { formatStatValue } from '../../../../utils/format_stat_value';
import { SectionContainer } from '../';
import { ApmFetchDataResponse } from '../../../../typings/fetch_data_response';

interface Props {
  data?: ApmFetchDataResponse;
}

export const APMSection = ({ data }: Props) => {
  const theme = useContext(ThemeContext);

  if (!data) {
    return null;
  }

  const transactionSeries = data.series.transactions;

  const xCoordinates = transactionSeries.coordinates.map((coordinate) => coordinate.x);

  const min = d3.min(xCoordinates);
  const max = d3.max(xCoordinates);

  const formatter = niceTimeFormatter([min, max]);

  const getSerieColor = (color?: string) => {
    if (color) {
      return theme.eui[color];
    }
  };

  return (
    <SectionContainer title={data.title} appLink={data.appLink}>
      <EuiFlexGroup>
        {Object.keys(data.stats).map((key) => {
          const stat = data.stats[key as keyof ApmFetchDataResponse['stats']];
          return (
            <EuiFlexItem key={key} grow={false}>
              <EuiStat title={formatStatValue(stat)} description={stat.label} />
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
      <Chart size={{ height: 220 }}>
        <Settings
          onBrushEnd={({ x }) => {
            console.log('#### APM', x);
          }}
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
              xScaleType="time"
              xAccessor={'x'}
              yAccessors={['y']}
              color={getSerieColor(transactionSeries.color)}
              groupId="transactions"
            />
            <Axis
              id="left-axis"
              position="left"
              showGridLines
              groupId="transactions"
              tickFormat={(d) => numeral(d).format('0a')}
            />
          </>
        )}
        <Axis id="bottom-axis" position="bottom" tickFormat={formatter} showGridLines />
      </Chart>
    </SectionContainer>
  );
};
