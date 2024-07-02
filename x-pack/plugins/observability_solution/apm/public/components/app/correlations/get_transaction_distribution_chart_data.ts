/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { UseEuiThemeWithColorsVis } from '../../../hooks/use_theme';
import type { HistogramItem } from '../../../../common/correlations/types';
import { DurationDistributionChartData } from '../../shared/charts/duration_distribution_chart';
import { LatencyCorrelation } from '../../../../common/correlations/latency_correlations/types';
import { FailedTransactionsCorrelation } from '../../../../common/correlations/failed_transactions_correlations/types';

export function getTransactionDistributionChartData({
  euiTheme,
  allTransactionsHistogram,
  failedTransactionsHistogram,
  selectedTerm,
}: {
  euiTheme: UseEuiThemeWithColorsVis;
  allTransactionsHistogram?: HistogramItem[];
  failedTransactionsHistogram?: HistogramItem[];
  selectedTerm?: LatencyCorrelation | FailedTransactionsCorrelation | undefined;
}) {
  const transactionDistributionChartData: DurationDistributionChartData[] = [];

  if (Array.isArray(allTransactionsHistogram)) {
    transactionDistributionChartData.push({
      id: i18n.translate('xpack.apm.transactionDistribution.chart.allTransactionsLabel', {
        defaultMessage: 'All transactions',
      }),
      histogram: allTransactionsHistogram,
      areaSeriesColor: euiTheme.euiPaletteColorBlind.euiColorVis1,
    });
  }

  if (Array.isArray(failedTransactionsHistogram)) {
    transactionDistributionChartData.push({
      id: i18n.translate('xpack.apm.transactionDistribution.chart.failedTransactionsLabel', {
        defaultMessage: 'Failed transactions',
      }),
      histogram: failedTransactionsHistogram,
      areaSeriesColor: euiTheme.euiPaletteColorBlind.euiColorVis7,
    });
  }

  if (selectedTerm && Array.isArray(selectedTerm.histogram)) {
    transactionDistributionChartData.push({
      id: `${selectedTerm.fieldName}:${selectedTerm.fieldValue}`,
      histogram: selectedTerm.histogram,
      areaSeriesColor: euiTheme.euiPaletteColorBlind.euiColorVis2,
    });
  }

  return transactionDistributionChartData;
}
