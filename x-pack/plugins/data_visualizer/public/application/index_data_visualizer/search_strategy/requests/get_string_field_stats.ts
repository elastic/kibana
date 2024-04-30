/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { get } from 'lodash';
import type { Observable } from 'rxjs';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs';
import type { AggregationsTermsAggregation } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type {
  IKibanaSearchRequest,
  IKibanaSearchResponse,
  ISearchOptions,
  ISearchStart,
} from '@kbn/data-plugin/public';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { extractErrorProperties } from '@kbn/ml-error-utils';
import { processTopValues } from './utils';
import { buildAggregationWithSamplingOption } from './build_random_sampler_agg';
import type {
  Aggs,
  Field,
  FieldStatsCommonRequestParams,
  StringFieldStats,
  FieldStatsError,
} from '../../../../../common/types/field_stats';
import { isIKibanaSearchResponse } from '../../../../../common/types/field_stats';

export const getStringFieldStatsRequest = (
  params: FieldStatsCommonRequestParams,
  fields: Field[]
) => {
  const { index, query, runtimeFieldMap } = params;

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

    aggs[`${safeFieldName}_top`] = top;
  });

  const searchBody = {
    query,
    aggs: buildAggregationWithSamplingOption(aggs, params.samplingOption),
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

        const aggsPath = ['sample'];
        const batchStats: StringFieldStats[] = [];

        fields.forEach((field, i) => {
          const safeFieldName = field.safeFieldName;

          const topAggsPath = [...aggsPath, `${safeFieldName}_top`];

          const fieldAgg = get(aggregations, [...topAggsPath], {});

          const { topValuesSampleSize, topValues } = processTopValues(
            fieldAgg,
            get(aggregations, ['sample', 'probability']) < 1
              ? get(aggregations, ['sample', 'doc_count'])
              : undefined
          );
          const stats = {
            fieldName: field.fieldName,
            isTopValuesSampled: true,
            topValues,
            topValuesSampleSize,
            topValuesSamplerShardSize: get(aggregations, ['sample', 'doc_count']),
          };

          batchStats.push(stats);
        });

        return batchStats;
      })
    );
};
