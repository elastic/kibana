/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { AreaSeries, Chart, DARK_THEME, LIGHT_THEME, ScaleType, Settings } from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem, EuiProgress, EuiStat } from '@elastic/eui';
import React, { useContext } from 'react';
import { ThemeContext } from 'styled-components';
import { i18n } from '@kbn/i18n';
import { EuiSpacer } from '@elastic/eui';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { SectionContainer } from '../';
import { MetricsFetchDataResponse, Series } from '../../../../typings/fetch_data_response';
import { formatStatValue } from '../../../../utils/format_stat_value';
import { getDataHandler } from '../../../../data_handler';

interface Props {
  startTime?: string;
  endTime?: string;
  bucketSize?: string;
}

export const MetricsSection = ({ startTime, endTime, bucketSize }: Props) => {
  const { data } = useFetcher(() => {
    if (startTime && endTime && bucketSize) {
      return getDataHandler('infra_metrics')?.fetchData({ startTime, endTime, bucketSize });
    }
  }, [startTime, endTime, bucketSize]);

  return (
    <SectionContainer
      title={data?.title || 'Metrics'}
      subtitle={i18n.translate('xpack.observability.overview.chart.metrics.subtitle', {
        defaultMessage: 'Summary',
      })}
      appLink={data?.appLink}
    >
      <EuiFlexGroup>
        {data &&
          Object.keys(data.stats).map((key) => {
            const statKey = key as keyof MetricsFetchDataResponse['stats'];
            const stat = data.stats[statKey];
            const value = formatStatValue(stat);

            const serie = data.series[key as keyof MetricsFetchDataResponse['series']];

            const chart = serie ? (
              <AreaChart serie={serie} />
            ) : (
              <>
                <EuiSpacer size="s" />
                <EuiProgress value={stat.value} max={1} />
              </>
            );

            return (
              <EuiFlexItem key={key}>
                <EuiStat title={value} description={stat.label} titleSize="m">
                  {statKey !== 'hosts' && chart}
                </EuiStat>
              </EuiFlexItem>
            );
          })}
      </EuiFlexGroup>
    </SectionContainer>
  );
};

const AreaChart = ({ serie }: { serie: Series }) => {
  const theme = useContext(ThemeContext);

  return (
    <Chart size={{ height: 30, width: 100 }}>
      <Settings
        theme={theme.darkMode ? DARK_THEME : LIGHT_THEME}
        showLegend={false}
        tooltip="none"
      />
      <AreaSeries
        id="area"
        xScaleType={ScaleType.Time}
        yScaleType={ScaleType.Linear}
        xAccessor={'x'}
        yAccessors={['y']}
        data={serie.coordinates}
      />
    </Chart>
  );
};
