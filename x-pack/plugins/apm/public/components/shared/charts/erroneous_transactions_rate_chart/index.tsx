/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { asPercent } from '../../../../../common/utils/formatters';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/useFetcher';
import { useTheme } from '../../../../hooks/useTheme';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { useServiceName } from '../../../../hooks/use_service_name';
import { callApmApi } from '../../../../services/rest/createCallApmApi';
import { LineChart } from '../line_chart';

function yLabelFormat(y?: number | null) {
  return asPercent(y || 0, 1);
}

function yTickFormat(y?: number | null) {
  return i18n.translate('xpack.apm.chart.averagePercentLabel', {
    defaultMessage: '{y} (avg.)',
    values: { y: yLabelFormat(y) },
  });
}

export function ErroneousTransactionsRateChart() {
  const theme = useTheme();
  const serviceName = useServiceName();
  const { urlParams, uiFilters } = useUrlParams();

  const { start, end, transactionType, transactionName } = urlParams;

  const { data, status } = useFetcher(() => {
    if (serviceName && start && end) {
      return callApmApi({
        pathname:
          '/api/apm/services/{serviceName}/transaction_groups/error_rate',
        params: {
          path: {
            serviceName,
          },
          query: {
            start,
            end,
            transactionType,
            transactionName,
            uiFilters: JSON.stringify(uiFilters),
          },
        },
      });
    }
  }, [serviceName, start, end, uiFilters, transactionType, transactionName]);

  const errorRates = data?.transactionErrorRate || [];

  return (
    <LineChart
      id="errorRate"
      isLoading={
        (status === FETCH_STATUS.LOADING || status === FETCH_STATUS.PENDING) &&
        !data
      }
      timeseries={[
        {
          data: errorRates,
          type: 'linemark',
          color: theme.eui.euiColorVis7,
          hideLegend: true,
          title: i18n.translate('xpack.apm.chart.currentPeriodLabel', {
            defaultMessage: 'Current period',
          }),
        },
      ]}
      yLabelFormat={yLabelFormat}
      yTickFormat={yTickFormat}
    />
  );
}
