/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetSLOResponse, getSLOResponseSchema } from '@kbn/slo-schema';
import { IndicatorData, SLO, SLOId, SLOWithSummary } from '../../domain/models';
import { SLORepository } from './slo_repository';
import { SLIClient } from './sli_client';
import { computeSLI, computeErrorBudget, computeSummaryStatus } from '../../domain/services';

export class GetSLO {
  constructor(private repository: SLORepository, private sliClient: SLIClient) {}

  public async execute(sloId: string): Promise<GetSLOResponse> {
    const slo = await this.repository.findById(sloId);

    const indicatorDataBySlo = await this.sliClient.fetchCurrentSLIData([slo]);
    const sloWithSummary = computeSloWithSummary(slo, indicatorDataBySlo);

    return this.toResponse(sloWithSummary);
  }

  private toResponse(slo: SLOWithSummary): GetSLOResponse {
    return getSLOResponseSchema.encode(slo);
  }
}

function computeSloWithSummary(
  slo: SLO,
  indicatorDataBySlo: Record<SLOId, IndicatorData>
): SLOWithSummary {
  const sliValue = computeSLI(indicatorDataBySlo[slo.id]);
  const errorBudget = computeErrorBudget(slo, indicatorDataBySlo[slo.id]);
  const status = computeSummaryStatus(slo, sliValue, errorBudget);
  return { ...slo, summary: { status, sliValue, errorBudget } };
}
