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
import { SLORepository } from './slo_repository';

export class FetchHistoricalSummary {
  constructor(
    private repository: SLORepository,
    private historicalSummaryClient: HistoricalSummaryClient
  ) {}

  public async execute({
    sloIds,
  }: FetchHistoricalSummaryParams): Promise<FetchHistoricalSummaryResponse> {
    const sloList = await this.repository.findAllByIds(sloIds);
    const historicalSummaryBySlo = await this.historicalSummaryClient.fetch(sloList);
    return fetchHistoricalSummaryResponseSchema.encode(historicalSummaryBySlo);
  }
}
