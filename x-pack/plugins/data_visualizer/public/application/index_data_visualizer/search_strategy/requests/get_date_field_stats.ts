/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchRequest } from '@elastic/elasticsearch/api/types';
import { get } from 'lodash';
import { Observable, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import {
  buildSamplerAggregation,
  getSamplerAggregationsResponsePath,
} from '../../../../../common/utils/query_utils';
import { isPopulatedObject } from '../../../../../common/utils/object_utils';
import type { FieldStatsCommonRequestParams } from '../../../../../common/search_strategy/types';
import type { Field, DateFieldStats, Aggs } from '../../types/field_stats';
import {
  DataPublicPluginStart,
  IKibanaSearchRequest,
  IKibanaSearchResponse,
  ISearchOptions,
} from '../../../../../../../../src/plugins/data/public';
import { FieldStatsError, isIKibanaSearchResponse } from '../../types/field_stats';
import { extractErrorProperties } from '../../utils/error_utils';

export const getDateFieldStatsRequest = (params: FieldStatsCommonRequestParams, field: Field) => {
  const { index, query, runtimeFieldMap, samplerShardSize } = params;

  const size = 0;

  const aggs: Aggs = {};
  const safeFieldName = field.safeFieldName;
  aggs[`${safeFieldName}_field_stats`] = {
    filter: { exists: { field: field.fieldName } },
    aggs: {
      actual_stats: {
        stats: { field: field.fieldName },
      },
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

export const fetchDateFieldStats = (
  data: DataPublicPluginStart,
  params: FieldStatsCommonRequestParams,
  field: Field,
  options: ISearchOptions
): Observable<DateFieldStats | FieldStatsError> => {
  const { samplerShardSize } = params;

  const request: SearchRequest = getDateFieldStatsRequest(params, field);
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
        return of({
          fieldName: field.fieldName,
          count: docCount,
          earliest: get(fieldStatsResp, 'min', 0),
          latest: get(fieldStatsResp, 'max', 0),
        });
      })
    );
};
