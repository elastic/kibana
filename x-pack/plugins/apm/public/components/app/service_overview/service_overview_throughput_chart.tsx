/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useParams } from 'react-router-dom';
import { asTransactionRate } from '../../../../common/utils/formatters';
import { useFetcher } from '../../../hooks/use_fetcher';
import { useTheme } from '../../../hooks/use_theme';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { TimeseriesChart } from '../../shared/charts/timeseries_chart';

const INITIAL_STATE = {
  currentPeriod: [],
  previousPeriod: [],
};

export function ServiceOverviewThroughputChart({
  height,
}: {
  height?: number;
}) {
  const theme = useTheme();
  const { serviceName } = useParams<{ serviceName?: string }>();
  const { urlParams, uiFilters } = useUrlParams();
  const { transactionType } = useApmServiceContext();
  const { environment, start, end } = urlParams;

  const { data = INITIAL_STATE, status } = useFetcher(
    (callApmApi) => {
      if (serviceName && transactionType && start && end) {
        return callApmApi({
          endpoint: 'GET /api/apm/services/{serviceName}/throughput',
          params: {
            path: {
              serviceName,
            },
            query: {
              environment,
              start,
              end,
              transactionType,
              uiFilters: JSON.stringify(uiFilters),
            },
          },
        });
      }
    },
    [environment, serviceName, start, end, uiFilters, transactionType]
  );

  return (
    <EuiPanel>
      <EuiTitle size="xs">
        <h2>
          {i18n.translate('xpack.apm.serviceOverview.throughtputChartTitle', {
            defaultMessage: 'Throughput',
          })}
        </h2>
      </EuiTitle>
      <TimeseriesChart
        id="throughput"
        height={height}
        showAnnotations={false}
        fetchStatus={status}
        timeseries={[
          {
            data: data.currentPeriod,
            type: 'linemark',
            color: theme.eui.euiColorVis0,
            title: i18n.translate(
              'xpack.apm.serviceOverview.throughtputChartTitle',
              { defaultMessage: 'Throughput' }
            ),
          },
        ]}
        yLabelFormat={asTransactionRate}
      />
    </EuiPanel>
  );
}
