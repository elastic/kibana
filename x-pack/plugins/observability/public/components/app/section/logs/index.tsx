/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Axis,
  BarSeries,
  niceTimeFormatter,
  Position,
  ScaleType,
  Settings,
  XYBrushEvent,
} from '@elastic/charts';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  euiPaletteColorBlind,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import moment from 'moment';
import React, { Fragment, Suspense } from 'react';
import { createBrowserHistory } from 'history';
import { Await, useLoaderData } from 'react-router-dom';
import { SectionContainer } from '..';
import { useChartTheme } from '../../../../hooks/use_chart_theme';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { useHasData } from '../../../../hooks/use_has_data';
import { useDatePickerContext } from '../../../../hooks/use_date_picker_context';
import { LogsFetchDataResponse } from '../../../../typings';
import { formatStatValue } from '../../../../utils/format_stat_value';
import { ChartContainer } from '../../chart_container';
import { StyledStat } from '../../styled_stat';
import { onBrushEnd } from '../helper';
import { BucketSize } from '../../../../pages/overview';

interface Props {
  bucketSize: BucketSize;
}

function getColorPerItem(series?: LogsFetchDataResponse['series']) {
  if (!series) {
    return {};
  }
  const availableColors = euiPaletteColorBlind({
    rotations: Math.ceil(Object.keys(series).length / 10),
  });
  const colorsPerItem = Object.keys(series).reduce((acc: Record<string, string>, key, index) => {
    acc[key] = availableColors[index];
    return acc;
  }, {});

  return colorsPerItem;
}

export function LogsSection({ bucketSize }: Props) {
  const history = createBrowserHistory();
  const chartTheme = useChartTheme();
  const { hasDataMap } = useHasData();
  const { absoluteStart, absoluteEnd } = useDatePickerContext();

  const data = useLoaderData() as any;

  if (!hasDataMap.infra_logs?.hasData) {
    return null;
  }

  const min = moment.utc(absoluteStart).valueOf();
  const max = moment.utc(absoluteEnd).valueOf();

  const formatter = niceTimeFormatter([min, max]);

  const isLoading = status === FETCH_STATUS.LOADING;

  return (
    <Suspense fallback={<EuiLoadingSpinner />}>
      <Await resolve={data.logEvents}>
        {(metrics: LogsFetchDataResponse) => {
          if (!metrics) {
            return <EuiLoadingSpinner />;
          }
          const colorsPerItem = getColorPerItem(metrics.series);
          return (
            <SectionContainer
              title={i18n.translate('xpack.observability.overview.logs.title', {
                defaultMessage: 'Log Events',
              })}
              appLink={{
                href: metrics.appLink,
                label: i18n.translate('xpack.observability.overview.logs.appLink', {
                  defaultMessage: 'Show log stream',
                }),
              }}
              hasError={status === FETCH_STATUS.FAILURE}
            >
              <EuiTitle size="xxs">
                <h4>
                  {i18n.translate('xpack.observability.overview.logs.subtitle', {
                    defaultMessage: 'Logs rate per minute',
                  })}
                </h4>
              </EuiTitle>
              <EuiSpacer size="s" />
              return (
              <>
                <EuiFlexGroup>
                  {!metrics.stats || isEmpty(metrics.stats) ? (
                    <EuiFlexItem grow={false}>
                      <StyledStat isLoading={false} />
                    </EuiFlexItem>
                  ) : (
                    Object.keys(metrics.stats).map((key) => {
                      const stat = metrics.stats[key];
                      return (
                        <EuiFlexItem grow={false} key={key}>
                          <StyledStat
                            title={formatStatValue(stat)}
                            description={stat.label}
                            isLoading={false}
                            color={colorsPerItem[key]}
                          />
                        </EuiFlexItem>
                      );
                    })
                  )}
                </EuiFlexGroup>

                <ChartContainer isInitialLoad={isLoading && !data}>
                  <Settings
                    onBrushEnd={(event) => onBrushEnd({ x: (event as XYBrushEvent).x, history })}
                    theme={chartTheme}
                    showLegend
                    legendPosition={Position.Right}
                    xDomain={{ min, max }}
                    showLegendExtra
                  />
                  {metrics.series &&
                    Object.keys(metrics.series).map((key) => {
                      const serie = metrics.series[key];
                      const chartData = serie.coordinates.map((coordinate) => ({
                        ...coordinate,
                        g: serie.label,
                      }));
                      return (
                        <Fragment key={key}>
                          <BarSeries
                            id={key}
                            xScaleType={ScaleType.Time}
                            yScaleType={ScaleType.Linear}
                            xAccessor={'x'}
                            yAccessors={['y']}
                            stackAccessors={['x']}
                            splitSeriesAccessors={['g']}
                            data={chartData}
                            color={colorsPerItem[key]}
                          />
                          <Axis
                            id="x-axis"
                            position={Position.Bottom}
                            showOverlappingTicks={false}
                            showOverlappingLabels={false}
                            tickFormat={formatter}
                          />
                          <Axis
                            id="y-axis"
                            gridLine={{ visible: true }}
                            position={Position.Left}
                            tickFormat={(d: number) => numeral(d).format('0a')}
                          />
                        </Fragment>
                      );
                    })}
                </ChartContainer>
              </>
              );
            </SectionContainer>
          );
        }}
      </Await>
    </Suspense>
  );
}
