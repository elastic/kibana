/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { SLO_SUMMARY_DESTINATION_INDEX_PATTERN } from '@kbn/observability-plugin/common/slo/constants';
import {
  FetchHistoricalSummaryParams,
  FetchHistoricalSummaryResponse,
  fetchHistoricalSummaryResponseSchema,
} from '@kbn/slo-schema';
import { HistoricalSummaryClient, SLOWithInstanceId } from './historical_summary_client';
import { SLORepository } from './slo_repository';
import { EsSummaryDocument } from './summary_transform_generator/helpers/create_temp_summary';
import { fromSummaryDocumentToSlo } from './unsafe_federated/helper';

export class FetchHistoricalSummary {
  constructor(
    private repository: SLORepository,
    private historicalSummaryClient: HistoricalSummaryClient,
    private esClient: ElasticsearchClient
  ) {}

  public async execute(
    params: FetchHistoricalSummaryParams
  ): Promise<FetchHistoricalSummaryResponse> {
    const sloIds = params.list.map((slo) => slo.sloId);

    const localSloList = await this.repository.findAllByIds(sloIds);
    const localSloIds = localSloList.map((slo) => slo.id);

    const localList = params.list.filter(({ sloId }) => localSloIds.includes(sloId));
    const remoteList = params.list.filter(({ sloId }) => !localSloIds.includes(sloId));

    const remoteSummarySearch = await this.esClient.search<EsSummaryDocument>({
      index: `remote_cluster:${SLO_SUMMARY_DESTINATION_INDEX_PATTERN}`,
      query: {
        bool: {
          filter: [{ term: { spaceId: 'default' } }],
          should: remoteList.map(({ sloId, instanceId }) => ({
            bool: {
              filter: [{ term: { 'slo.id': sloId } }, { term: { 'slo.instanceId': instanceId } }],
            },
          })),
          minimum_should_match: 1,
        },
      },
    });

    const remoteSloList = remoteSummarySearch.hits.hits
      .map((doc) => fromSummaryDocumentToSlo(doc._source!)!)
      .filter((doc) => !!doc);

    const local = localList.map(({ sloId, instanceId }) => ({
      sloId,
      instanceId,
      slo: localSloList.find((slo) => sloId === slo.id)!,
    }));

    // We need to filter with the remote slo list from the remote indices.
    const remote = remoteList
      .filter(({ sloId, instanceId }) => remoteSloList.some((slo) => slo.id === sloId))
      .map(({ sloId, instanceId }) => ({
        sloId,
        instanceId,
        slo: remoteSloList.find((slo) => sloId === slo.id)!,
      }));

    const list: SLOWithInstanceId[] = [...local, ...remote];

    const historicalSummary = await this.historicalSummaryClient.fetch(list);

    return fetchHistoricalSummaryResponseSchema.encode(historicalSummary);
  }
}
