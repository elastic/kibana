/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { EuiTheme } from '../../../../../../../src/plugins/kibana_react/common';
import type { HistogramItem } from '../../../../common/correlations/types';
import { TransactionDistributionChartData } from '../../shared/charts/transaction_distribution_chart';
import { LatencyCorrelation } from '../../../../common/correlations/latency_correlations/types';
import { FailedTransactionsCorrelation } from '../../../../common/correlations/failed_transactions_correlations/types';

export function getTransactionDistributionChartData({
  euiTheme,
  allTransactionsHistogram,
  failedTransactionsHistogram,
  selectedTerm,
}: {
  euiTheme: EuiTheme;
  allTransactionsHistogram?: HistogramItem[];
  failedTransactionsHistogram?: HistogramItem[];
  selectedTerm?: LatencyCorrelation | FailedTransactionsCorrelation | undefined;
}) {
  const transactionDistributionChartData: TransactionDistributionChartData[] =
    [];

  if (Array.isArray(allTransactionsHistogram)) {
    transactionDistributionChartData.push({
      id: i18n.translate(
        'xpack.apm.transactionDistribution.chart.allTransactionsLabel',
        { defaultMessage: 'All transactions' }
      ),
      histogram: allTransactionsHistogram,
      areaSeriesColor: euiTheme.eui.euiColorVis1,
    });
  }

  if (Array.isArray(failedTransactionsHistogram)) {
    transactionDistributionChartData.push({
      id: i18n.translate(
        'xpack.apm.transactionDistribution.chart.failedTransactionsLabel',
        { defaultMessage: 'Failed transactions' }
      ),
      histogram: failedTransactionsHistogram,
      areaSeriesColor: euiTheme.eui.euiColorVis7,
    });
  }

  if (selectedTerm && Array.isArray(selectedTerm.histogram)) {
    transactionDistributionChartData.push({
      id: `${selectedTerm.fieldName}:${selectedTerm.fieldValue}`,
      histogram: selectedTerm.histogram,
      areaSeriesColor: euiTheme.eui.euiColorVis2,
    });
  }

  return transactionDistributionChartData;
}
