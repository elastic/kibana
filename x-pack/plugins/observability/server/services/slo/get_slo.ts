/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { SLO_SUMMARY_DESTINATION_INDEX_PATTERN } from '@kbn/observability-plugin/common/slo/constants';
import { ALL_VALUE, GetSLOParams, GetSLOResponse, getSLOResponseSchema } from '@kbn/slo-schema';
import { SLO, Summary } from '../../domain/models';
import { SLORepository } from './slo_repository';
import { SummaryClient } from './summary_client';
import { EsSummaryDocument } from './summary_transform_generator/helpers/create_temp_summary';
import { fromSummaryDocumentToSlo } from './unsafe_federated/helper';

export class GetSLO {
  constructor(
    private repository: SLORepository,
    private summaryClient: SummaryClient,
    private esClient: ElasticsearchClient
  ) {}

  public async execute(sloId: string, params: GetSLOParams = {}): Promise<GetSLOResponse> {
    const instanceId = params.instanceId ?? ALL_VALUE;
    // find a way to set this based on the sloId used
    const unsafeIsRemote = true;
    let slo;
    if (unsafeIsRemote) {
      const summarySearch = await this.esClient.search<EsSummaryDocument>({
        index: `remote_cluster:${SLO_SUMMARY_DESTINATION_INDEX_PATTERN}`,
        query: {
          bool: {
            filter: [
              { term: { spaceId: 'default' } },
              { term: { 'slo.id': sloId } },
              { term: { 'slo.instanceId': instanceId } },
            ],
          },
        },
      });

      if (summarySearch.hits.hits.length === 0) {
        throw new Error('SLO not found');
      }

      slo = fromSummaryDocumentToSlo(summarySearch.hits.hits[0]._source!);
    } else {
      slo = await this.repository.findById(sloId);
    }

    const summary = await this.summaryClient.computeSummary(slo!, instanceId);
    return getSLOResponseSchema.encode(mergeSloWithSummary(slo!, summary, instanceId));
  }
}

function mergeSloWithSummary(slo: SLO, summary: Summary, instanceId: string) {
  return { ...slo, instanceId, summary };
}
