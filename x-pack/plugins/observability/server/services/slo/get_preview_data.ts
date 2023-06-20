/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { GetPreviewDataParams, GetPreviewDataResponse } from '@kbn/slo-schema';
import { computeSLI } from '../../domain/services';
import { InvalidQueryError } from '../../errors';

export class GetPreviewData {
  constructor(private esClient: ElasticsearchClient) {}

  public async execute(params: GetPreviewDataParams): Promise<GetPreviewDataResponse> {
    switch (params.indicator.type) {
      case 'sli.kql.custom':
        const filterQuery = getElastichsearchQueryOrThrow(params.indicator.params.filter);
        const goodQuery = getElastichsearchQueryOrThrow(params.indicator.params.good);
        const totalQuery = getElastichsearchQueryOrThrow(params.indicator.params.total);
        const timestampField = params.indicator.params.timestampField;

        try {
          const result = await this.esClient.search({
            index: params.indicator.params.index,
            query: {
              bool: {
                filter: [{ range: { [timestampField]: { gte: 'now-60m' } } }, filterQuery],
              },
            },
            aggs: {
              perMinute: {
                date_histogram: {
                  field: timestampField,
                  fixed_interval: '1m',
                },
                aggs: {
                  good: { filter: goodQuery },
                  total: { filter: totalQuery },
                },
              },
            },
          });

          // @ts-ignore buckets is not improperly typed
          return result.aggregations?.perMinute.buckets.map((bucket) => ({
            date: bucket.key_as_string,
            sliValue: computeSLI(bucket.good.doc_count, bucket.total.doc_count),
          }));
        } catch (err) {
          throw new InvalidQueryError(`Invalid ES query`);
        }

      default:
        return [];
    }
  }
}

function getElastichsearchQueryOrThrow(kuery: string) {
  try {
    return toElasticsearchQuery(fromKueryExpression(kuery));
  } catch (err) {
    throw new InvalidQueryError(`Invalid kuery: ${kuery}`);
  }
}
