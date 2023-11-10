/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { ALL_VALUE, DeleteSLOInstancesParams } from '@kbn/slo-schema';
import {
  SLO_DESTINATION_INDEX_PATTERN,
  SLO_SUMMARY_DESTINATION_INDEX_PATTERN,
} from '../../assets/constants';
import { IllegalArgumentError } from '../../errors';

interface SloInstanceTuple {
  sloId: string;
  instanceId: string;
}

export class DeleteSLOInstances {
  constructor(private esClient: ElasticsearchClient) {}

  public async execute(params: DeleteSLOInstancesParams): Promise<void> {
    const containsAllValueInstanceId = params.list.some((item) => item.instanceId === ALL_VALUE);
    if (containsAllValueInstanceId) {
      throw new IllegalArgumentError("Cannot delete an SLO instance '*'");
    }

    await this.deleteRollupData(params.list);
    await this.deleteSummaryData(params.list);
  }

  private async deleteRollupData(list: SloInstanceTuple[]): Promise<void> {
    await this.esClient.deleteByQuery({
      index: SLO_DESTINATION_INDEX_PATTERN,
      wait_for_completion: false,
      query: {
        bool: {
          should: list.map((item) => ({
            bool: {
              must: [
                { term: { 'slo.id': item.sloId } },
                { term: { 'slo.instanceId': item.instanceId } },
              ],
            },
          })),
        },
      },
    });
  }

  private async deleteSummaryData(list: SloInstanceTuple[]): Promise<void> {
    await this.esClient.deleteByQuery({
      index: SLO_SUMMARY_DESTINATION_INDEX_PATTERN,
      refresh: true,
      query: {
        bool: {
          should: list.map((item) => ({
            bool: {
              must: [
                { term: { 'slo.id': item.sloId } },
                { term: { 'slo.instanceId': item.instanceId } },
              ],
            },
          })),
        },
      },
    });
  }
}
