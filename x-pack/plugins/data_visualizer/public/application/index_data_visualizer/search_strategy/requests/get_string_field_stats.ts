/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchRequest } from '@elastic/elasticsearch/api/types';
import { get } from 'lodash';
import { Observable, of, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { SAMPLER_TOP_TERMS_SHARD_SIZE, SAMPLER_TOP_TERMS_THRESHOLD } from './constants';
import {
  buildSamplerAggregation,
  getSamplerAggregationsResponsePath,
} from '../../../../../common/utils/query_utils';
import { isPopulatedObject } from '../../../../../common/utils/object_utils';
import type { FieldStatsCommonRequestParams } from '../../../../../common/search_strategy/types';
import type { Aggs, Bucket, Field, StringFieldStats } from '../../types/field_stats';
import {
  DataPublicPluginStart,
  IKibanaSearchRequest,
  IKibanaSearchResponse,
  ISearchOptions,
} from '../../../../../../../../src/plugins/data/public';
import { FieldStatsError, isIKibanaSearchResponse } from '../../types/field_stats';
import { extractErrorProperties } from '../../utils/error_utils';

export const getStringFieldStatsRequest = (params: FieldStatsCommonRequestParams, field: Field) => {
  const { index, query, runtimeFieldMap, samplerShardSize } = params;

  const size = 0;

  const aggs: Aggs = {};

  const safeFieldName = field.safeFieldName;
  const top = {
    terms: {
      field: field.fieldName,
      size: 10,
      order: {
        _count: 'desc',
      },
    },
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

export const fetchStringFieldStats = (
  data: DataPublicPluginStart,
  params: FieldStatsCommonRequestParams,
  field: Field,
  options: ISearchOptions
): Observable<StringFieldStats | FieldStatsError> => {
  const { samplerShardSize } = params;
  const request: SearchRequest = getStringFieldStatsRequest(params, field);

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

        return of(stats);
      })
    );
};
