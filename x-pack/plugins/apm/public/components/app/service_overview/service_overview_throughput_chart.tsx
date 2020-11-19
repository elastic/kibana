/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useParams } from 'react-router-dom';
import { useFetcher } from '../../../hooks/useFetcher';
import { useTheme } from '../../../hooks/useTheme';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { callApmApi } from '../../../services/rest/createCallApmApi';
import { getTPMTooltipFormatter } from '../../shared/charts/helper/helper';
import { LineChart } from '../../shared/charts/line_chart';

export function ServiceOverviewThroughputChart({
  height,
}: {
  height?: number;
}) {
  const theme = useTheme();
  const { serviceName } = useParams<{ serviceName?: string }>();
  const { urlParams, uiFilters } = useUrlParams();
  const transactionType = 'request';
  const { start, end } = urlParams;

  const { data, status } = useFetcher(() => {
    if (serviceName && start && end) {
      return callApmApi({
        endpoint: 'GET /api/apm/services/{serviceName}/throughput',
        params: {
          path: {
            serviceName,
          },
          query: {
            start,
            end,
            transactionType,
            uiFilters: JSON.stringify(uiFilters),
          },
        },
      });
    }
  }, [serviceName, start, end, uiFilters, transactionType]);
  const { throughput } = data ?? { throughput: [] };

  return (
    <EuiPanel>
      <EuiTitle size="xs">
        <h2>
          {i18n.translate('xpack.apm.serviceOverview.throughtputChartTitle', {
            defaultMessage: 'Traffic',
          })}
        </h2>
      </EuiTitle>
      <LineChart
        id="throughput"
        height={height}
        showAnnotations={false}
        fetchStatus={status}
        timeseries={[
          {
            data: throughput,
            type: 'linemark',
            color: theme.eui.euiColorVis0,
            hideLegend: true,
            title: i18n.translate(
              'xpack.apm.serviceOverview.throughputChart.currentPeriodLabel',
              {
                defaultMessage: 'Current period',
              }
            ),
          },
        ]}
        yLabelFormat={getTPMTooltipFormatter(transactionType)}
      />
    </EuiPanel>
  );
}
