/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { ALL_VALUE, GetSLOInstancesResponse } from '@kbn/slo-schema';
import { SLO_DESTINATION_INDEX_PATTERN } from '../../common/constants';
import { SLORepository } from './slo_repository';

export class GetSLOInstances {
  constructor(private repository: SLORepository, private esClient: ElasticsearchClient) {}

  public async execute(sloId: string): Promise<GetSLOInstancesResponse> {
    const slo = await this.repository.findById(sloId);

    if ([slo.groupBy].flat().includes(ALL_VALUE)) {
      return { groupBy: ALL_VALUE, instances: [] };
    }

    const result = await this.esClient.search({
      index: SLO_DESTINATION_INDEX_PATTERN,
      size: 0,
      query: {
        bool: {
          filter: [
            { range: { '@timestamp': { gte: 'now-7d' } } },
            { term: { 'slo.id': slo.id } },
            { term: { 'slo.revision': slo.revision } },
          ],
        },
      },
      aggs: {
        instances: {
          terms: {
            size: 1000,
            field: 'slo.instanceId',
          },
        },
      },
    });

    // @ts-ignore
    const buckets = result?.aggregations?.instances.buckets ?? [];
    const instances = buckets.map((bucket: { key: string }) => bucket.key);
    return { groupBy: slo.groupBy, instances };
  }
}
