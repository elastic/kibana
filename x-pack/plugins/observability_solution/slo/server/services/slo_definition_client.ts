/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { SLORepository } from './slo_repository';
import { SLO_SUMMARY_DESTINATION_INDEX_PATTERN } from '../../common/constants';
import { EsSummaryDocument } from './summary_transform_generator/helpers/create_temp_summary';
import { fromSummaryDocumentToSlo } from './unsafe_federated/helper';
import { SLO } from '../domain/models';

export class SloDefinitionClient {
  constructor(
    private repository: SLORepository,
    private esClient: ElasticsearchClient,
    private logger: Logger
  ) {}

  public async execute(sloId: string, remoteName?: string) {
    let slo: SLO | undefined;
    if (remoteName) {
      const summarySearch = await this.esClient.search<EsSummaryDocument>({
        index: `${remoteName}:${SLO_SUMMARY_DESTINATION_INDEX_PATTERN}`,
        query: {
          bool: {
            filter: [{ term: { spaceId: 'default' } }, { term: { 'slo.id': sloId } }],
          },
        },
      });

      if (summarySearch.hits.hits.length === 0) {
        throw new Error('SLO not found');
      }
      const doc = summarySearch.hits.hits[0]._source!;

      slo = fromSummaryDocumentToSlo(doc, this.logger);
    } else {
      slo = await this.repository.findById(sloId);
    }
    return slo;
  }
}
