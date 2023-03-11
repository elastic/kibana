/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetSLOResponse, getSLOResponseSchema } from '@kbn/slo-schema';
import { SLO, SLOId, SLOWithSummary, Summary } from '../../domain/models';
import { SLORepository } from './slo_repository';
import { SummaryClient } from './summary_client';

export class GetSLO {
  constructor(private repository: SLORepository, private summaryClient: SummaryClient) {}

  public async execute(sloId: string): Promise<GetSLOResponse> {
    const slo = await this.repository.findById(sloId);
    const summaryBySlo = await this.summaryClient.fetchSummary([slo]);

    const sloWithSummary = mergeSloWithSummary(slo, summaryBySlo);

    return getSLOResponseSchema.encode(sloWithSummary);
  }
}

function mergeSloWithSummary(slo: SLO, summaryBySlo: Record<SLOId, Summary>): SLOWithSummary {
  return { ...slo, summary: summaryBySlo[slo.id] };
}
