/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicatorData, SLO, SLOId, SLOWithSummary } from '../../domain/models';
import { GetSLOResponse, getSLOResponseSchema } from '../../types/rest_specs';
import { SLORepository } from './slo_repository';
import { SLIClient } from './sli_client';
import { computeSLI, computeErrorBudget } from '../../domain/services';

export class GetSLO {
  constructor(private repository: SLORepository, private sliClient: SLIClient) {}

  public async execute(sloId: string): Promise<GetSLOResponse> {
    const slo = await this.repository.findById(sloId);

    const indicatorDataBySlo = await this.sliClient.fetchCurrentSLIData([slo]);
    const sloWithSummary = computeSloWithSummary(slo, indicatorDataBySlo);

    return this.toResponse(sloWithSummary);
  }

  private toResponse(slo: SLOWithSummary): GetSLOResponse {
    return getSLOResponseSchema.encode({
      id: slo.id,
      name: slo.name,
      description: slo.description,
      indicator: slo.indicator,
      time_window: slo.time_window,
      budgeting_method: slo.budgeting_method,
      objective: slo.objective,
      settings: slo.settings,
      summary: slo.summary,
      revision: slo.revision,
      created_at: slo.created_at,
      updated_at: slo.updated_at,
    });
  }
}

function computeSloWithSummary(
  slo: SLO,
  indicatorDataBySlo: Record<SLOId, IndicatorData>
): SLOWithSummary {
  const sliValue = computeSLI(indicatorDataBySlo[slo.id]);
  const errorBudget = computeErrorBudget(slo, indicatorDataBySlo[slo.id]);
  return { ...slo, summary: { sli_value: sliValue, error_budget: errorBudget } };
}
