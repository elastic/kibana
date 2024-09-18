/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FetchHistoricalSummaryResponse } from '@kbn/slo-schema';
import { HEALTHY_ROLLING_SLO, historicalSummaryData } from '../../data/slo/historical_summary_data';
import { Params, UseFetchHistoricalSummaryResponse } from '../use_fetch_historical_summary';

export const useFetchHistoricalSummary = ({
  sloList = [],
}: Params): UseFetchHistoricalSummaryResponse => {
  const data: FetchHistoricalSummaryResponse = [];
  sloList.forEach(({ id, instanceId }) =>
    data.push({
      sloId: id,
      instanceId: instanceId!,
      data: historicalSummaryData.find((datum) => datum.sloId === HEALTHY_ROLLING_SLO)!.data,
    })
  );

  return {
    isLoading: false,
    isInitialLoading: false,
    isRefetching: false,
    isSuccess: false,
    isError: false,
    data,
  };
};
