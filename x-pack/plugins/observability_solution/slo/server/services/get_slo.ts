/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ALL_VALUE, GetSLOParams, GetSLOResponse, getSLOResponseSchema } from '@kbn/slo-schema';
import { Groupings, Meta, SLO, Summary } from '../domain/models';
import { SLORepository } from './slo_repository';
import { SummaryClient } from './summary_client';

export class GetSLO {
  constructor(private repository: SLORepository, private summaryClient: SummaryClient) {}

  public async execute(sloId: string, params: GetSLOParams = {}): Promise<GetSLOResponse> {
    const slo = await this.repository.findById(sloId);

    const instanceId = params.instanceId ?? ALL_VALUE;
    const { summary, groupings, meta } = await this.summaryClient.computeSummary(slo, instanceId);

    return getSLOResponseSchema.encode(
      mergeSloWithSummary(slo, summary, instanceId, groupings, meta)
    );
  }
}

function mergeSloWithSummary(
  slo: SLO,
  summary: Summary,
  instanceId: string,
  groupings: Groupings,
  meta: Meta
) {
  return { ...slo, instanceId, summary, groupings, meta };
}
