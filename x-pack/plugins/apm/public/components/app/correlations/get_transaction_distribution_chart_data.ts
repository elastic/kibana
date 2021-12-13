/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { EuiTheme } from '../../../../../../../src/plugins/kibana_react/common';
import type {
  FieldValuePair,
  HistogramItem,
} from '../../../../common/correlations/types';
import { TransactionDistributionChartData } from '../../shared/charts/transaction_distribution_chart';

export function getTransactionDistributionChartData({
  euiTheme,
  foreground,
  background,
  selectedTerm,
}: {
  euiTheme: EuiTheme;
  foreground?: {
    histogram: HistogramItem[];
    label: string;
  };
  background?: {
    histogram: HistogramItem[];
    label: string;
  };
  selectedTerm?: FieldValuePair & { histogram: HistogramItem[] };
}) {
  const transactionDistributionChartData: TransactionDistributionChartData[] =
    [];

  if (foreground) {
    transactionDistributionChartData.push({
      id: foreground.label,
      histogram: foreground.histogram,
      areaSeriesColor: euiTheme.eui.euiColorVis1,
    });
  }

  if (background) {
    transactionDistributionChartData.push({
      id: background.label,
      histogram: background.histogram,
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
