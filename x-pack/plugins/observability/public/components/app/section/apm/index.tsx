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
import { EuiFlexGroup, EuiFlexItem, EuiToolTip, EuiIcon } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import React, { useContext } from 'react';
import { useHistory } from 'react-router-dom';
import { ThemeContext } from 'styled-components';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { SectionContainer } from '../';
import { getDataHandler } from '../../../../data_handler';
import { useChartTheme } from '../../../../hooks/use_chart_theme';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { useHasData } from '../../../../hooks/use_has_data';
import { ChartContainer } from '../../chart_container';
import { StyledStat } from '../../styled_stat';
import { onBrushEnd } from '../helper';
import { BucketSize } from '../../../../pages/overview';

interface Props {
  bucketSize: BucketSize;
}

function formatTpm(value?: number) {
  return numeral(value).format('0.00a');
}

function formatTpmStat(value?: number) {
  if (!value || value === 0) {
    return '0';
  }
  if (value <= 0.1) {
    return '< 0.1';
  }
  if (value > 1000) {
    return numeral(value).format('0.00a');
  }
  return numeral(value).format('0,0.0');
}

export function APMSection({ bucketSize }: Props) {
  const theme = useContext(ThemeContext);
  const chartTheme = useChartTheme();
  const history = useHistory();
  const { forceUpdate, hasDataMap } = useHasData();
  const { relativeStart, relativeEnd, absoluteStart, absoluteEnd } = useTimeRange();

  const { data, status } = useFetcher(
    () => {
      if (bucketSize) {
        return getDataHandler('apm')?.fetchData({
          absoluteTime: { start: absoluteStart, end: absoluteEnd },
          relativeTime: { start: relativeStart, end: relativeEnd },
          ...bucketSize,
        });
      }
    },
    // Absolute times shouldn't be used here, since it would refetch on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bucketSize, relativeStart, relativeEnd, forceUpdate]
  );

  if (!hasDataMap.apm?.hasData) {
    return null;
  }

  const { appLink, stats, series } = data || {};

  const min = moment.utc(absoluteStart).valueOf();
  const max = moment.utc(absoluteEnd).valueOf();

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
            title={`${formatTpmStat(stats?.transactions.value)} tpm`}
            description={
              <EuiToolTip
                content={i18n.translate('xpack.observability.overview.apm.throughputTip', {
                  defaultMessage:
                    'Values are calculated for transactions with type "Request" or "page-load". If neither are available, values reflect the top transaction type.',
                })}
              >
                <>
                  {i18n.translate('xpack.observability.overview.apm.throughput', {
                    defaultMessage: 'Throughput',
                  })}{' '}
                  <EuiIcon
                    size="s"
                    color="subdued"
                    type="questionInCircle"
                    className="eui-alignCenter"
                  />
                </>
              </EuiToolTip>
            }
            isLoading={isLoading}
            color={transactionsColor}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <ChartContainer isInitialLoad={isLoading && !data}>
        <Settings
          onBrushEnd={(event) => onBrushEnd({ x: (event as XYBrushEvent).x, history })}
          theme={chartTheme}
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
              gridLine={{ visible: true }}
              tickFormat={(value) => `${formatTpm(value)} tpm`}
            />
            <Axis id="x-axis" position={Position.Bottom} tickFormat={formatter} />
          </>
        )}
      </ChartContainer>
    </SectionContainer>
  );
}
