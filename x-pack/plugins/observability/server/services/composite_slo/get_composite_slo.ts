/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compositeSLOResponseSchema, GetCompositeSLOResponse } from '@kbn/slo-schema';
import { CompositeSLO, CompositeSLOId, Summary } from '../../domain/models';
import { CompositeSLORepository } from './composite_slo_repository';
import { SummaryClient } from './summary_client';

export class GetCompositeSLO {
  constructor(
    private compositeSloRepository: CompositeSLORepository,
    private summaryClient: SummaryClient
  ) {}

  public async execute(compositeSloId: CompositeSLOId): Promise<GetCompositeSLOResponse> {
    const compositeSlo = await this.compositeSloRepository.findById(compositeSloId);
    const summaryByCompositeSlo = await this.summaryClient.fetchSummary([compositeSlo]);

    return toResponse(compositeSlo, summaryByCompositeSlo[compositeSlo.id]);
  }
}

function toResponse(compositeSlo: CompositeSLO, summary: Summary): GetCompositeSLOResponse {
  return {
    ...compositeSLOResponseSchema.encode(compositeSlo),
    summary,
  };
}
