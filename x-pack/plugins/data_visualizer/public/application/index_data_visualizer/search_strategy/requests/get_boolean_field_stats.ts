/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { get } from 'lodash';
import type { SearchRequest } from '@elastic/elasticsearch/api/types';
import { Observable, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import {
  buildSamplerAggregation,
  getSamplerAggregationsResponsePath,
} from '../../../../../common/utils/query_utils';
import { isPopulatedObject } from '../../../../../common/utils/object_utils';
import type { FieldStatsCommonRequestParams } from '../../../../../common/search_strategy/types';
import type { Field, BooleanFieldStats, Aggs } from '../../types/field_stats';
import { FieldStatsError, isIKibanaSearchResponse } from '../../types/field_stats';
import {
  DataPublicPluginStart,
  IKibanaSearchRequest,
  IKibanaSearchResponse,
  ISearchOptions,
} from '../../../../../../../../src/plugins/data/public';
import { extractErrorProperties } from '../../utils/error_utils';

export const getBooleanFieldStatsRequest = (
  params: FieldStatsCommonRequestParams,
  field: Field
) => {
  const { index, query, runtimeFieldMap, samplerShardSize } = params;

  const size = 0;
  const aggs: Aggs = {};

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

export const fetchBooleanFieldStats = (
  data: DataPublicPluginStart,
  params: FieldStatsCommonRequestParams,
  field: Field,
  options: ISearchOptions
): Observable<BooleanFieldStats | FieldStatsError> => {
  const { samplerShardSize } = params;
  const request: SearchRequest = getBooleanFieldStatsRequest(params, field);
  return data.search
    .search<IKibanaSearchRequest, IKibanaSearchResponse>({ params: request }, options)
    .pipe(
      catchError((e) =>
        of({
          fieldName: field.fieldName,
          error: extractErrorProperties(e),
        } as FieldStatsError)
      ),
      switchMap((resp) => {
        if (!isIKibanaSearchResponse(resp)) return of(resp);

        const aggregations = resp.rawResponse.aggregations;
        const aggsPath = getSamplerAggregationsResponsePath(samplerShardSize);

        const safeFieldName = field.safeFieldName;
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
        return of(stats);
      })
    );
};
