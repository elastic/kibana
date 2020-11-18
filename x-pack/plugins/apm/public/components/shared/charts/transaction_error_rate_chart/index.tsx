/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useParams } from 'react-router-dom';
import { asPercent } from '../../../../../common/utils/formatters';
import { useFetcher } from '../../../../hooks/useFetcher';
import { useTheme } from '../../../../hooks/useTheme';
import { useUrlParams } from '../../../../hooks/useUrlParams';
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

interface Props {
  showAnnotations?: boolean;
}

export function TransactionErrorRateChart({ showAnnotations = true }: Props) {
  const theme = useTheme();
  const { serviceName } = useParams<{ serviceName?: string }>();
  const { urlParams, uiFilters } = useUrlParams();

  const { start, end, transactionType, transactionName } = urlParams;

  const { data, status } = useFetcher(() => {
    if (serviceName && start && end) {
      return callApmApi({
        endpoint:
          'GET /api/apm/services/{serviceName}/transaction_groups/error_rate',
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
    <EuiPanel>
      <EuiTitle size="xs">
        <h2>
          {i18n.translate('xpack.apm.errorRate', {
            defaultMessage: 'Error rate',
          })}
        </h2>
      </EuiTitle>
      <LineChart
        id="errorRate"
        showAnnotations={showAnnotations}
        fetchStatus={status}
        timeseries={[
          {
            data: errorRates,
            type: 'linemark',
            color: theme.eui.euiColorVis7,
            hideLegend: true,
            title: i18n.translate('xpack.apm.errorRate.currentPeriodLabel', {
              defaultMessage: 'Current period',
            }),
          },
        ]}
        yLabelFormat={yLabelFormat}
        yTickFormat={yTickFormat}
      />
    </EuiPanel>
  );
}
