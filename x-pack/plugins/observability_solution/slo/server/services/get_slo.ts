/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_VALUE, GetSLOParams, GetSLOResponse, getSLOResponseSchema } from '@kbn/slo-schema';
import { SloDefinitionClient } from './slo_definition_client';
import { SummaryClient } from './summary_client';

export class GetSLO {
  constructor(
    private definitionClient: SloDefinitionClient,
    private summaryClient: SummaryClient
  ) {}

  public async execute(
    sloId: string,
    spaceId: string,
    params: GetSLOParams = {}
  ): Promise<GetSLOResponse> {
    const instanceId = params.instanceId ?? ALL_VALUE;
    const remoteName = params.remoteName;
    const { slo, remote } = await this.definitionClient.execute(sloId, spaceId, remoteName);
    const { summary, groupings, meta } = await this.summaryClient.computeSummary({
      slo,
      instanceId,
      remoteName,
    });

    return getSLOResponseSchema.encode({
      ...slo,
      instanceId,
      summary,
      groupings,
      meta,
      remoteName,
      kibanaUrl: remote?.kibanaUrl,
    });
  }
}
