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
import {
  buildSamplerAggregation,
  getSamplerAggregationsResponsePath,
} from '../../../../../common/utils/query_utils';
import { isPopulatedObject } from '../../../../../common/utils/object_utils';
import type { FieldStatsCommonRequestParams } from '../../../../../common/types/field_stats';
import type { Field, DateFieldStats, Aggs } from '../../../../../common/types/field_stats';
import type {
  IKibanaSearchRequest,
  IKibanaSearchResponse,
  ISearchOptions,
  ISearchStart,
} from '../../../../../../../../src/plugins/data/public';
import { FieldStatsError, isIKibanaSearchResponse } from '../../../../../common/types/field_stats';
import { extractErrorProperties } from '../../utils/error_utils';

export const getDateFieldsStatsRequest = (
  params: FieldStatsCommonRequestParams,
  fields: Field[]
) => {
  const { index, query, runtimeFieldMap, samplerShardSize } = params;

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
    aggs: buildSamplerAggregation(aggs, samplerShardSize),
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
  const { samplerShardSize } = params;

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
        const aggsPath = getSamplerAggregationsResponsePath(samplerShardSize);

        const batchStats: DateFieldStats[] = fields.map((field, i) => {
          const safeFieldName = field.safeFieldName;
          const docCount = get(
            aggregations,
            [...aggsPath, `${safeFieldName}_field_stats`, 'doc_count'],
            0
          );
          const fieldStatsResp = get(
            aggregations,
            [...aggsPath, `${safeFieldName}_field_stats`, 'actual_stats'],
            {}
          );
          return {
            fieldName: field.fieldName,
            count: docCount,
            earliest: get(fieldStatsResp, 'min', 0),
            latest: get(fieldStatsResp, 'max', 0),
          } as DateFieldStats;
        });
        return batchStats;
      })
    );
};
