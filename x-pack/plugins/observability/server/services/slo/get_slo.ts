/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ErrorBudget, SLO } from '../../types/models';
import { GetSLOResponse } from '../../types/rest_specs';
import { SLORepository } from './slo_repository';
import { SLIClient } from './sli_client';
import { computeSLI, computeErrorBudget } from '../../domain/services';

export class GetSLO {
  constructor(private repository: SLORepository, private sliClient: SLIClient) {}

  public async execute(sloId: string): Promise<GetSLOResponse> {
    const slo = await this.repository.findById(sloId);
    const sliData = await this.sliClient.fetchDataForSLOTimeWindow(slo);
    const sliValue = computeSLI(sliData);
    const errorBudget = computeErrorBudget(slo, sliData);
    return this.toResponse(slo, sliValue, errorBudget);
  }

  private toResponse(slo: SLO, sliValue: number, errorBudget: ErrorBudget): GetSLOResponse {
    return {
      id: slo.id,
      name: slo.name,
      description: slo.description,
      indicator: slo.indicator,
      time_window: slo.time_window,
      budgeting_method: slo.budgeting_method,
      objective: slo.objective,
      summary: {
        sli_value: sliValue,
        error_budget: {
          ...errorBudget,
        },
      },
      revision: slo.revision,
      created_at: slo.created_at,
      updated_at: slo.updated_at,
    };
  }
}
