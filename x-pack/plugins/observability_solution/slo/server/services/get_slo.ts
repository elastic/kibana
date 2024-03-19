/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { ALL_VALUE, GetSLOParams, GetSLOResponse, getSLOResponseSchema } from '@kbn/slo-schema';
import { SLO_SUMMARY_DESTINATION_INDEX_PATTERN } from '../../common/constants';
import { Groupings, Meta, SLO, Summary } from '../domain/models';
import { SLORepository } from './slo_repository';
import { SummaryClient } from './summary_client';
import { EsSummaryDocument } from './summary_transform_generator/helpers/create_temp_summary';
import { fromSummaryDocumentToSlo } from './unsafe_federated/helper';

export class GetSLO {
  constructor(
    private repository: SLORepository,
    private summaryClient: SummaryClient,
    private esClient: ElasticsearchClient,
    private logger: Logger
  ) {}

  public async execute(sloId: string, params: GetSLOParams = {}): Promise<GetSLOResponse> {
    const instanceId = params.instanceId ?? ALL_VALUE;
    const remoteName = params.remoteName;

    let slo;
    let kibanaUrl;
    if (remoteName) {
      const summarySearch = await this.esClient.search<EsSummaryDocument>({
        index: `${remoteName}:${SLO_SUMMARY_DESTINATION_INDEX_PATTERN}`,
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
      const doc = summarySearch.hits.hits[0]._source!;
      kibanaUrl = doc.kibanaUrl;

      slo = fromSummaryDocumentToSlo(doc, this.logger);
    } else {
      slo = await this.repository.findById(sloId);
    }
    if (slo) {
      const { summary, groupings, meta } = await this.summaryClient.computeSummary({
        slo,
        instanceId,
        remoteName,
      });

      return getSLOResponseSchema.encode(
        mergeSloWithSummary(slo, summary, instanceId, groupings, meta, remoteName, kibanaUrl)
      );
    } else {
      throw new Error('SLO not found');
    }
  }
}

function mergeSloWithSummary(
  slo: SLO,
  summary: Summary,
  instanceId: string,
  groupings: Groupings,
  meta: Meta,
  remoteName?: string,
  kibanaUrl?: string
) {
  return { ...slo, instanceId, summary, groupings, meta, remoteName, kibanaUrl };
}
