/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HistoricalSummaryResponse } from '@kbn/slo-schema';
import { ChartData } from '../../typings/slo';

type DataType = 'error_budget_remaining' | 'error_budget_consumed' | 'sli_value';

export function formatHistoricalData(
  historicalSummary: HistoricalSummaryResponse[] | undefined = [],
  dataType: DataType
): ChartData[] {
  function getDataValue(data: HistoricalSummaryResponse) {
    switch (dataType) {
      case 'error_budget_consumed':
        return data.errorBudget.consumed;
      case 'error_budget_remaining':
        return data.errorBudget.remaining;
      default:
        return data.sliValue;
    }
  }

  if (!historicalSummary) {
    return [];
  }

  return historicalSummary.map((data) => ({
    key: new Date(data.date).getTime(),
    value: data.status === 'NO_DATA' ? undefined : getDataValue(data),
  }));
}
