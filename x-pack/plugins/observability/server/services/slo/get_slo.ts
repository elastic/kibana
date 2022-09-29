/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLO } from '../../types/models';
import { GetSLOResponse } from '../../types/rest_specs';
import { SLORepository } from './slo_repository';

export class GetSLO {
  constructor(private repository: SLORepository) {}

  public async execute(sloId: string): Promise<GetSLOResponse> {
    const slo = await this.repository.findById(sloId);
    return this.toResponse(slo);
  }

  private toResponse(slo: SLO): GetSLOResponse {
    return {
      id: slo.id,
      name: slo.name,
      description: slo.description,
      indicator: slo.indicator,
      time_window: slo.time_window,
      budgeting_method: slo.budgeting_method,
      objective: slo.objective,
    };
  }
}
