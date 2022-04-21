/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Axis,
  BarSeries,
  Chart,
  niceTimeFormatter,
  Position,
  ScaleType,
  Settings,
} from '@elastic/charts';
import { EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { useLegacyUrlParams } from '../../../../context/url_params_context/use_url_params';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { useTheme } from '../../../../hooks/use_theme';
import { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import { ChartContainer } from '../../../shared/charts/chart_container';
import { getTimeZone } from '../../../shared/charts/helper/timezone';

type ErrorDistributionAPIResponse =
  APIReturnType<'GET /internal/apm/services/{serviceName}/errors/distribution'>;

interface Props {
  fetchStatus: FETCH_STATUS;
  distribution: ErrorDistributionAPIResponse;
  title: React.ReactNode;
}

export function ErrorDistribution({ distribution, title, fetchStatus }: Props) {
  const { core } = useApmPluginContext();
  const theme = useTheme();

  const { urlParams } = useLegacyUrlParams();
  const { comparisonEnabled } = urlParams;

  const timeseries = [
    {
      data: distribution.currentPeriod,
      color: theme.eui.euiColorVis1,
      title: i18n.translate('xpack.apm.errorGroup.chart.ocurrences', {
        defaultMessage: 'Occurrences',
      }),
    },
    ...(comparisonEnabled
      ? [
          {
            data: distribution.previousPeriod,
            color: theme.eui.euiColorMediumShade,
            title: i18n.translate(
              'xpack.apm.errorGroup.chart.ocurrences.previousPeriodLabel',
              { defaultMessage: 'Previous period' }
            ),
          },
        ]
      : []),
  ];

  const xValues = timeseries.flatMap(({ data }) => data.map(({ x }) => x));

  const min = Math.min(...xValues);
  const max = Math.max(...xValues);

  const xFormatter = niceTimeFormatter([min, max]);

  const timeZone = getTimeZone(core.uiSettings);

  return (
    <>
      <EuiTitle size="xs">
        <span>{title}</span>
      </EuiTitle>
      <ChartContainer
        hasData={!!distribution}
        height={256}
        status={fetchStatus}
        id="errorDistribution"
      >
        <Chart>
          <Settings
            xDomain={{ min, max }}
            tooltip={{ stickTo: 'top' }}
            showLegend
            showLegendExtra
            legendPosition={Position.Bottom}
          />
          <Axis
            id="x-axis"
            position={Position.Bottom}
            showOverlappingTicks
            tickFormat={xFormatter}
          />
          <Axis
            id="y-axis"
            position={Position.Left}
            ticks={2}
            gridLine={{ visible: true }}
          />

          {timeseries.map((serie) => {
            return (
              <BarSeries
                timeZone={timeZone}
                key={serie.title}
                id={serie.title}
                minBarHeight={2}
                xScaleType={ScaleType.Linear}
                yScaleType={ScaleType.Linear}
                xAccessor="x"
                yAccessors={['y']}
                data={serie.data}
                color={serie.color}
              />
            );
          })}
        </Chart>
      </ChartContainer>
    </>
  );
}
