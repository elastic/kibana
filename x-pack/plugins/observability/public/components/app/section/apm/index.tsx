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
  LineSeries,
  niceTimeFormatter,
  Position,
  Settings,
} from '@elastic/charts';
import { EuiStat } from '@elastic/eui';
import numeral from '@elastic/numeral';
import React, { useContext } from 'react';
import { ThemeContext } from 'styled-components';
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

  const startAPM = transactionSeries?.coordinates[0].x || 0;
  const endAPM = transactionSeries?.coordinates[transactionSeries?.coordinates.length - 1].x || 0;
  const formatterAPM = niceTimeFormatter([startAPM, endAPM]);

  const getSerieColor = (color?: string) => {
    if (color) {
      return theme.eui[color];
    }
  };

  return (
    <SectionContainer title={data.title} appLink={data.appLink}>
      {/* {data.stats.map((stat) => (
        <EuiStat key={stat.label} title={stat.value} description={stat.label} />
      ))} */}
      <Chart size={{ height: 220 }}>
        <Settings
          onBrushEnd={({ x }) => {
            console.log('#### APM', x);
          }}
          theme={theme.darkMode ? DARK_THEME : LIGHT_THEME}
          showLegend={true}
          legendPosition="bottom"
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
        <Axis id="bottom-axis" position="bottom" tickFormat={formatterAPM} showGridLines />
      </Chart>
    </SectionContainer>
  );
};
