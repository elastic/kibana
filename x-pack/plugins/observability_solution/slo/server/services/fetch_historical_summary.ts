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
import { HistoricalSummaryClient, SLOWithInstanceId } from './historical_summary_client';
import { SLORepository } from './slo_repository';

export class FetchHistoricalSummary {
  constructor(
    private repository: SLORepository,
    private historicalSummaryClient: HistoricalSummaryClient
  ) {}

  public async execute(
    params: FetchHistoricalSummaryParams
  ): Promise<FetchHistoricalSummaryResponse> {
    const sloIds = params.list.map((slo) => slo.sloId);
    const sloList = await this.repository.findAllByIds(sloIds);

    const list: SLOWithInstanceId[] = params.list
      .filter(({ sloId }) => sloList.find((slo) => slo.id === sloId))
      .map(({ sloId, instanceId }) => ({
        sloId,
        instanceId,
        slo: sloList.find((slo) => slo.id === sloId)!,
      }));

    const historicalSummary = await this.historicalSummaryClient.fetch(list);

    return fetchHistoricalSummaryResponseSchema.encode(historicalSummary);
  }
}
