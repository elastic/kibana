/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexGroupProps, useResizeObserver } from '@elastic/eui';
import { SunburstChart } from './sunburst_chart';
import { useBreakpoints } from '../../../../../hooks/use_breakpoints';
import { APIReturnType } from '../../../../../services/rest/create_call_apm_api';
import { useFetcher } from '../../../../../hooks/use_fetcher';
import { MobileProperty } from '../../../../../../common/mobile_types';

type MostUsedCharts =
  APIReturnType<'GET /internal/apm/mobile-services/{serviceName}/most_used_charts'>['mostUsedCharts'][0];

const MOST_USED_CHARTS: Array<{ key: MostUsedCharts['key']; label: string }> = [
  {
    key: MobileProperty.Device,
    label: i18n.translate('xpack.apm.mobile.charts.device', {
      defaultMessage: 'Devices',
    }),
  },
  {
    key: MobileProperty.NetworkConnectionType,
    label: i18n.translate('xpack.apm.mobile.charts.nct', {
      defaultMessage: 'Network Connection Type',
    }),
  },
  {
    key: MobileProperty.OsVersion,
    label: i18n.translate('xpack.apm.mobile.charts.osVersion', {
      defaultMessage: 'OS version',
    }),
  },
  {
    key: MobileProperty.AppVersion,
    label: i18n.translate('xpack.apm.mobile.charts.appVersion', {
      defaultMessage: 'App version',
    }),
  },
];
export function MostUsedCharts({
  start,
  end,
  kuery,
  environment,
  transactionType,
  serviceName,
}: {
  start: string;
  end: string;
  kuery: string;
  environment: string;
  transactionType?: string;
  serviceName: string;
}) {
  const { isLarge } = useBreakpoints();
  const resizeRef = useRef<HTMLDivElement>(null);
  const dimensions = useResizeObserver(resizeRef.current);
  const groupDirection: EuiFlexGroupProps['direction'] = isLarge ? 'column' : 'row';
  const { data = { mostUsedCharts: [] }, status } = useFetcher(
    (callApmApi) => {
      return callApmApi('GET /internal/apm/mobile-services/{serviceName}/most_used_charts', {
        params: {
          path: { serviceName },
          query: {
            start,
            end,
            environment,
            kuery,
            transactionType,
          },
        },
      });
    },
    [start, end, environment, kuery, serviceName, transactionType]
  );

  const chartWidth = isLarge ? dimensions.width : dimensions.width / MOST_USED_CHARTS.length;

  return (
    <div ref={resizeRef}>
      <EuiFlexGroup direction={groupDirection} gutterSize="s" justifyContent="spaceBetween">
        {MOST_USED_CHARTS.map(({ key, label }) => {
          const chartData = data?.mostUsedCharts.find((chart) => chart.key === key)?.options || [];
          return (
            <div key={key}>
              <SunburstChart
                data={chartData}
                label={label}
                chartKey={key}
                fetchStatus={status}
                chartWidth={chartWidth}
              />
            </div>
          );
        })}
      </EuiFlexGroup>
    </div>
  );
}
