/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import { i18n } from '@kbn/i18n';
import { max } from 'lodash';
import React, { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { asPercent } from '../../../../../common/utils/formatters';
import { useChartsSync } from '../../../../hooks/useChartsSync';
import { useFetcher } from '../../../../hooks/useFetcher';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { callApmApi } from '../../../../services/rest/createCallApmApi';
// @ts-expect-error
import CustomPlot from '../CustomPlot';

const tickFormatY = (y?: number) => {
  return asPercent(y || 0, 1);
};

export function ErroneousTransactionsRateChart() {
  const { serviceName } = useParams<{ serviceName?: string }>();
  const { urlParams, uiFilters } = useUrlParams();
  const syncedChartsProps = useChartsSync();

  const { start, end, transactionType, transactionName } = urlParams;

  const { data } = useFetcher(() => {
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

  const combinedOnHover = useCallback(
    (hoverX: number) => {
      return syncedChartsProps.onHover(hoverX);
    },
    [syncedChartsProps]
  );

  const errorRates = data?.erroneousTransactionsRate || [];
  const maxRate = max(errorRates.map((errorRate) => errorRate.y));

  return (
    <EuiPanel>
      <EuiTitle size="xs">
        <span>
          {i18n.translate('xpack.apm.errorRateChart.title', {
            defaultMessage: 'Transaction error rate',
          })}
        </span>
      </EuiTitle>
      <EuiSpacer size="m" />
      <CustomPlot
        {...syncedChartsProps}
        noHits={data?.noHits}
        yMax={maxRate === 0 ? 1 : undefined}
        series={[
          {
            color: theme.euiColorVis7,
            data: [],
            legendValue: tickFormatY(data?.average),
            legendClickDisabled: true,
            title: i18n.translate('xpack.apm.errorRateChart.avgLabel', {
              defaultMessage: 'Avg.',
            }),
            type: 'linemark',
            hideTooltipValue: true,
          },
          {
            data: errorRates,
            type: 'linemark',
            color: theme.euiColorVis7,
            hideLegend: true,
            title: i18n.translate('xpack.apm.errorRateChart.rateLabel', {
              defaultMessage: 'Rate',
            }),
          },
        ]}
        onHover={combinedOnHover}
        tickFormatY={tickFormatY}
        formatTooltipValue={({ y }: { y?: number }) =>
          Number.isFinite(y) ? tickFormatY(y) : 'N/A'
        }
      />
    </EuiPanel>
  );
}
