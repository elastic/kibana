/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FetchHistoricalSummaryParams,
  FetchHistoricalSummaryResponse,
  fetchHistoricalSummaryResponseSchema,
} from '@kbn/slo-schema';
import { HistoricalSummaryClient } from './historical_summary_client';

export class FetchHistoricalSummary {
  constructor(private historicalSummaryClient: HistoricalSummaryClient) {}

  public async execute(
    params: FetchHistoricalSummaryParams
  ): Promise<FetchHistoricalSummaryResponse> {
    const historicalSummary = await this.historicalSummaryClient.fetch(params);

    return fetchHistoricalSummaryResponseSchema.encode(historicalSummary);
  }
}
