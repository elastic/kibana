/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { get } from 'lodash';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AggregationsTermsAggregation } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type {
  IKibanaSearchRequest,
  IKibanaSearchResponse,
  ISearchOptions,
  ISearchStart,
} from '@kbn/data-plugin/public';
import { SAMPLER_TOP_TERMS_SHARD_SIZE, SAMPLER_TOP_TERMS_THRESHOLD } from './constants';
import {
  buildSamplerAggregation,
  getSamplerAggregationsResponsePath,
} from '../../../../../common/utils/query_utils';
import { isPopulatedObject } from '../../../../../common/utils/object_utils';
import type {
  Aggs,
  Bucket,
  Field,
  FieldStatsCommonRequestParams,
  StringFieldStats,
} from '../../../../../common/types/field_stats';
import { FieldStatsError, isIKibanaSearchResponse } from '../../../../../common/types/field_stats';
import { extractErrorProperties } from '../../utils/error_utils';

export const getStringFieldStatsRequest = (
  params: FieldStatsCommonRequestParams,
  fields: Field[]
) => {
  const { index, query, runtimeFieldMap, samplerShardSize } = params;

  const size = 0;

  const aggs: Aggs = {};
  fields.forEach((field, i) => {
    const safeFieldName = field.safeFieldName;
    const top = {
      terms: {
        field: field.fieldName,
        size: 10,
        order: {
          _count: 'desc',
        },
      } as AggregationsTermsAggregation,
    };

    // If cardinality >= SAMPLE_TOP_TERMS_THRESHOLD, run the top terms aggregation
    // in a sampler aggregation, even if no sampling has been specified (samplerShardSize < 1).
    if (samplerShardSize < 1 && field.cardinality >= SAMPLER_TOP_TERMS_THRESHOLD) {
      aggs[`${safeFieldName}_top`] = {
        sampler: {
          shard_size: SAMPLER_TOP_TERMS_SHARD_SIZE,
        },
        aggs: {
          top,
        },
      };
    } else {
      aggs[`${safeFieldName}_top`] = top;
    }
  });

  const searchBody = {
    query,
    aggs: buildSamplerAggregation(aggs, samplerShardSize),
    ...(isPopulatedObject(runtimeFieldMap) ? { runtime_mappings: runtimeFieldMap } : {}),
  };

  return {
    index,
    size,
    body: searchBody,
  };
};

export const fetchStringFieldsStats = (
  dataSearch: ISearchStart,
  params: FieldStatsCommonRequestParams,
  fields: Field[],
  options: ISearchOptions
): Observable<StringFieldStats[] | FieldStatsError> => {
  const { samplerShardSize } = params;
  const request: estypes.SearchRequest = getStringFieldStatsRequest(params, fields);

  return dataSearch
    .search<IKibanaSearchRequest, IKibanaSearchResponse>({ params: request }, options)
    .pipe(
      catchError((e) =>
        of({
          fields,
          error: extractErrorProperties(e),
        } as FieldStatsError)
      ),
      map((resp) => {
        if (!isIKibanaSearchResponse(resp)) return resp;
        const aggregations = resp.rawResponse.aggregations;
        const aggsPath = getSamplerAggregationsResponsePath(samplerShardSize);
        const batchStats: StringFieldStats[] = [];

        fields.forEach((field, i) => {
          const safeFieldName = field.safeFieldName;

          const topAggsPath = [...aggsPath, `${safeFieldName}_top`];
          if (samplerShardSize < 1 && field.cardinality >= SAMPLER_TOP_TERMS_THRESHOLD) {
            topAggsPath.push('top');
          }

          const topValues: Bucket[] = get(aggregations, [...topAggsPath, 'buckets'], []);

          const stats = {
            fieldName: field.fieldName,
            isTopValuesSampled:
              field.cardinality >= SAMPLER_TOP_TERMS_THRESHOLD || samplerShardSize > 0,
            topValues,
            topValuesSampleSize: topValues.reduce(
              (acc, curr) => acc + curr.doc_count,
              get(aggregations, [...topAggsPath, 'sum_other_doc_count'], 0)
            ),
            topValuesSamplerShardSize:
              field.cardinality >= SAMPLER_TOP_TERMS_THRESHOLD
                ? SAMPLER_TOP_TERMS_SHARD_SIZE
                : samplerShardSize,
          };

          batchStats.push(stats);
        });

        return batchStats;
      })
    );
};
