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
import type {
  IKibanaSearchResponse,
  IKibanaSearchRequest,
  ISearchOptions,
} from '@kbn/search-types';
import type { ISearchStart } from '@kbn/data-plugin/public';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { extractErrorProperties } from '@kbn/ml-error-utils';
import { buildAggregationWithSamplingOption } from './build_random_sampler_agg';
import type {
  FieldStatsCommonRequestParams,
  FieldStatsError,
} from '../../../../../common/types/field_stats';
import type { Field, DateFieldStats, Aggs } from '../../../../../common/types/field_stats';
import { isIKibanaSearchResponse } from '../../../../../common/types/field_stats';

export const getDateFieldsStatsRequest = (
  params: FieldStatsCommonRequestParams,
  fields: Field[]
) => {
  const { index, query, runtimeFieldMap } = params;

  const size = 0;

  const aggs: Aggs = {};
  fields.forEach((field, i) => {
    const safeFieldName = field.safeFieldName;
    aggs[`${safeFieldName}_field_stats`] = {
      filter: { exists: { field: field.fieldName } },
      aggs: {
        actual_stats: {
          stats: { field: field.fieldName },
        },
      },
    };
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

export const fetchDateFieldsStats = (
  dataSearch: ISearchStart,
  params: FieldStatsCommonRequestParams,
  fields: Field[],
  options: ISearchOptions
): Observable<DateFieldStats[] | FieldStatsError> => {
  const request: estypes.SearchRequest = getDateFieldsStatsRequest(params, fields);
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

        const batchStats: DateFieldStats[] = fields.map((field, i) => {
          const safeFieldName = field.safeFieldName;
          const fieldStatsResp = get(
            aggregations,
            [...aggsPath, `${safeFieldName}_field_stats`, 'actual_stats'],
            {}
          );
          return {
            fieldName: field.fieldName,
            earliest: get(fieldStatsResp, 'min', 0),
            latest: get(fieldStatsResp, 'max', 0),
          } as DateFieldStats;
        });
        return batchStats;
      })
    );
};
