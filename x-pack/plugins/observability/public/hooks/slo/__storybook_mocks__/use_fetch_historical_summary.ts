/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HistoricalSummaryResponse } from '@kbn/slo-schema';
import {
  HEALTHY_ROLLING_SLO,
  historicalSummaryData,
} from '../../../data/slo/historical_summary_data';
import { UseFetchHistoricalSummaryResponse, Params } from '../use_fetch_historical_summary';

export const useFetchHistoricalSummary = ({
  sloIds = [],
}: Params): UseFetchHistoricalSummaryResponse => {
  const data: Record<string, HistoricalSummaryResponse[]> = {};
  sloIds.forEach((sloId) => (data[sloId] = historicalSummaryData[HEALTHY_ROLLING_SLO]));
  return {
    loading: false,
    error: false,
    data,
  };
};
