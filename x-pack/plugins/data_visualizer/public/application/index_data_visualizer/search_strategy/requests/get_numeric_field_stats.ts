/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchRequest } from '@elastic/elasticsearch/api/types';
import { find, get } from 'lodash';
import { catchError, switchMap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import {
  MAX_PERCENT,
  PERCENTILE_SPACING,
  SAMPLER_TOP_TERMS_SHARD_SIZE,
  SAMPLER_TOP_TERMS_THRESHOLD,
} from './constants';
import {
  buildSamplerAggregation,
  getSamplerAggregationsResponsePath,
} from '../../../../../common/utils/query_utils';
import { isPopulatedObject } from '../../../../../common/utils/object_utils';
import type { FieldStatsCommonRequestParams } from '../../../../../common/types/field_stats';
import type {
  Field,
  NumericFieldStats,
  Bucket,
  FieldStatsError,
} from '../../../../../common/types/field_stats';
import { processDistributionData } from '../../utils/process_distribution_data';
import {
  IKibanaSearchRequest,
  IKibanaSearchResponse,
  ISearchOptions,
} from '../../../../../../../../src/plugins/data/common';
import { DataPublicPluginStart } from '../../../../../../../../src/plugins/data/public';
import { extractErrorProperties } from '../../utils/error_utils';
import { isIKibanaSearchResponse } from '../../../../../common/types/field_stats';

export const getNumericFieldStatsRequest = (
  params: FieldStatsCommonRequestParams,
  field: Field
) => {
  const { index, query, runtimeFieldMap, samplerShardSize } = params;

  const size = 0;

  // Build the percents parameter which defines the percentiles to query
  // for the metric distribution data.
  // Use a fixed percentile spacing of 5%.
  let count = 0;
  const percents = Array.from(
    Array(MAX_PERCENT / PERCENTILE_SPACING),
    () => (count += PERCENTILE_SPACING)
  );

  const aggs: { [key: string]: any } = {};
  const safeFieldName = field.safeFieldName;
  aggs[`${safeFieldName}_field_stats`] = {
    filter: { exists: { field: field.fieldName } },
    aggs: {
      actual_stats: {
        stats: { field: field.fieldName },
      },
    },
  };
  aggs[`${safeFieldName}_percentiles`] = {
    percentiles: {
      field: field.fieldName,
      percents,
      keyed: false,
    },
  };

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

export const fetchNumericFieldStats = (
  data: DataPublicPluginStart,
  params: FieldStatsCommonRequestParams,
  field: Field,
  options: ISearchOptions
): Observable<NumericFieldStats | FieldStatsError> => {
  const { samplerShardSize } = params;
  const request: SearchRequest = getNumericFieldStatsRequest(params, field);

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

        const topAggsPath = [...aggsPath, `${safeFieldName}_top`];
        if (samplerShardSize < 1 && field.cardinality >= SAMPLER_TOP_TERMS_THRESHOLD) {
          topAggsPath.push('top');
        }

        const topValues: Bucket[] = get(aggregations, [...topAggsPath, 'buckets'], []);

        const stats: NumericFieldStats = {
          fieldName: field.fieldName,
          count: docCount,
          min: get(fieldStatsResp, 'min', 0),
          max: get(fieldStatsResp, 'max', 0),
          avg: get(fieldStatsResp, 'avg', 0),
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

        if (stats.count > 0) {
          const percentiles = get(
            aggregations,
            [...aggsPath, `${safeFieldName}_percentiles`, 'values'],
            []
          );
          const medianPercentile: { value: number; key: number } | undefined = find(percentiles, {
            key: 50,
          });
          stats.median = medianPercentile !== undefined ? medianPercentile!.value : 0;
          stats.distribution = processDistributionData(percentiles, PERCENTILE_SPACING, stats.min);
        }
        return of(stats);
      })
    );
};
