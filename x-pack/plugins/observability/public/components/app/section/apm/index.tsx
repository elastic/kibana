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
  ScaleType,
  Position,
} from '@elastic/charts';
import d3 from 'd3';
import { EuiFlexGroup, EuiFlexItem, EuiStat } from '@elastic/eui';
import numeral from '@elastic/numeral';
import React, { useContext } from 'react';
import { ThemeContext } from 'styled-components';
import { i18n } from '@kbn/i18n';
import { getDataHandler } from '../../../../data_handler';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { formatStatValue } from '../../../../utils/format_stat_value';
import { SectionContainer } from '../';
import { ApmFetchDataResponse } from '../../../../typings/fetch_data_response';

interface Props {
  startTime?: string;
  endTime?: string;
  bucketSize?: string;
}

export const APMSection = ({ startTime, endTime, bucketSize }: Props) => {
  const theme = useContext(ThemeContext);
  const { data } = useFetcher(() => {
    if (startTime && endTime && bucketSize) {
      return getDataHandler('apm')?.fetchData({ startTime, endTime, bucketSize });
    }
  }, [startTime, endTime, bucketSize]);

  const transactionSeries = data?.series.transactions;

  const xCoordinates = transactionSeries
    ? transactionSeries.coordinates.map((coordinate) => coordinate.x)
    : [0];

  const min = d3.min(xCoordinates);
  const max = d3.max(xCoordinates);

  const formatter = niceTimeFormatter([min, max]);

  const getSerieColor = (color?: string) => {
    if (color) {
      return color;
    }
  };

  return (
    <SectionContainer
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
                <EuiStat title={formatStatValue(stat)} description={stat.label} titleSize="m" />
              </EuiFlexItem>
            );
          })}
      </EuiFlexGroup>
      <Chart size={{ height: 220 }}>
        <Settings
          onBrushEnd={({ x }) => {}}
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
    </SectionContainer>
  );
};
