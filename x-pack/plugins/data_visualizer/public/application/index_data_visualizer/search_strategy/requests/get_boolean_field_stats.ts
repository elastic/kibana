/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { get } from 'lodash';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import type {
  IKibanaSearchRequest,
  IKibanaSearchResponse,
  ISearchOptions,
  ISearchStart,
} from '@kbn/data-plugin/public';
import {
  buildSamplerAggregation,
  getSamplerAggregationsResponsePath,
} from '../../../../../common/utils/query_utils';
import { isPopulatedObject } from '../../../../../common/utils/object_utils';
import type {
  Field,
  BooleanFieldStats,
  Aggs,
  FieldStatsCommonRequestParams,
} from '../../../../../common/types/field_stats';
import { FieldStatsError, isIKibanaSearchResponse } from '../../../../../common/types/field_stats';
import { extractErrorProperties } from '../../utils/error_utils';

export const getBooleanFieldsStatsRequest = (
  params: FieldStatsCommonRequestParams,
  fields: Field[]
) => {
  const { index, query, runtimeFieldMap, samplerShardSize } = params;

  const size = 0;
  const aggs: Aggs = {};
  fields.forEach((field, i) => {
    const safeFieldName = field.safeFieldName;
    aggs[`${safeFieldName}_value_count`] = {
      filter: { exists: { field: field.fieldName } },
    };
    aggs[`${safeFieldName}_values`] = {
      terms: {
        field: field.fieldName,
        size: 2,
      },
    };
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

export const fetchBooleanFieldsStats = (
  dataSearch: ISearchStart,
  params: FieldStatsCommonRequestParams,
  fields: Field[],
  options: ISearchOptions
): Observable<BooleanFieldStats[] | FieldStatsError> => {
  const { samplerShardSize } = params;
  const request: estypes.SearchRequest = getBooleanFieldsStatsRequest(params, fields);
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

        const batchStats: BooleanFieldStats[] = fields.map((field, i) => {
          const safeFieldName = field.fieldName;
          const stats: BooleanFieldStats = {
            fieldName: field.fieldName,
            count: get(aggregations, [...aggsPath, `${safeFieldName}_value_count`, 'doc_count'], 0),
            trueCount: 0,
            falseCount: 0,
          };

          const valueBuckets: Array<{ [key: string]: number }> = get(
            aggregations,
            [...aggsPath, `${safeFieldName}_values`, 'buckets'],
            []
          );
          valueBuckets.forEach((bucket) => {
            stats[`${bucket.key_as_string}Count`] = bucket.doc_count;
          });
          return stats;
        });

        return batchStats;
      })
    );
};
