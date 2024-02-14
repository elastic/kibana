/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { find, get } from 'lodash';
import { catchError, map } from 'rxjs/operators';
import type { Observable } from 'rxjs';
import { of } from 'rxjs';
import type { AggregationsTermsAggregation } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type {
  IKibanaSearchRequest,
  IKibanaSearchResponse,
  ISearchOptions,
} from '@kbn/data-plugin/common';
import type { ISearchStart } from '@kbn/data-plugin/public';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { isDefined } from '@kbn/ml-is-defined';
import { extractErrorProperties } from '@kbn/ml-error-utils';
import { processTopValues } from './utils';
import { buildAggregationWithSamplingOption } from './build_random_sampler_agg';
import { MAX_PERCENT, PERCENTILE_SPACING } from './constants';
import type {
  Aggs,
  Bucket,
  FieldStatsCommonRequestParams,
} from '../../../../../common/types/field_stats';
import type {
  Field,
  NumericFieldStats,
  FieldStatsError,
} from '../../../../../common/types/field_stats';
import { processDistributionData } from '../../utils/process_distribution_data';
import {
  isIKibanaSearchResponse,
  isNormalSamplingOption,
} from '../../../../../common/types/field_stats';

export const getNumericFieldsStatsRequest = (
  params: FieldStatsCommonRequestParams,
  fields: Field[]
) => {
  const { index, query, runtimeFieldMap } = params;

  const size = 0;

  // Build the percents parameter which defines the percentiles to query
  // for the metric distribution data.
  // Use a fixed percentile spacing of 5%.
  let count = 0;
  const percents = Array.from(
    Array(MAX_PERCENT / PERCENTILE_SPACING),
    () => (count += PERCENTILE_SPACING)
  );

  const aggs: Aggs = {};

  fields.forEach((field, i) => {
    const { safeFieldName, supportedAggs } = field;

    const include = !isDefined(supportedAggs);

    if (include || supportedAggs.has('stats')) {
      aggs[`${safeFieldName}_field_stats`] = {
        filter: { exists: { field: field.fieldName } },
        aggs: {
          actual_stats: {
            stats: { field: field.fieldName },
          },
        },
      };
    }

    if (include || (supportedAggs.has('min') && supportedAggs.has('max'))) {
      aggs[`${safeFieldName}_min_max`] = {
        filter: { exists: { field: field.fieldName } },
        aggs: {
          min: {
            min: { field: field.fieldName },
          },
          max: {
            max: { field: field.fieldName },
          },
        },
      };
    }

    if (include || supportedAggs.has('percentiles')) {
      aggs[`${safeFieldName}_percentiles`] = {
        percentiles: {
          field: field.fieldName,
          percents,
          keyed: false,
        },
      };
    }

    if (include || supportedAggs.has('terms')) {
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
    }
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

const processStats = (safeFieldName: string, aggregations: object, aggsPath: string[]) => {
  const fieldStatsResp = get(
    aggregations,
    [...aggsPath, `${safeFieldName}_field_stats`, 'actual_stats'],
    undefined
  );
  if (fieldStatsResp) {
    return {
      min: get(fieldStatsResp, 'min'),
      max: get(fieldStatsResp, 'max'),
      avg: get(fieldStatsResp, 'avg'),
    };
  }
  const minMaxResp = get(aggregations, [...aggsPath, `${safeFieldName}_min_max`], {});
  if (minMaxResp) {
    return {
      min: get(minMaxResp, ['min', 'value']),
      max: get(minMaxResp, ['max', 'value']),
    };
  }
  return {};
};

export const fetchNumericFieldsStats = (
  dataSearch: ISearchStart,
  params: FieldStatsCommonRequestParams,
  fields: Field[],
  options: ISearchOptions
): Observable<NumericFieldStats[] | FieldStatsError> => {
  const request: estypes.SearchRequest = getNumericFieldsStatsRequest(params, fields);

  return dataSearch
    .search<IKibanaSearchRequest, IKibanaSearchResponse>({ params: request }, options)
    .pipe(
      catchError((e) => {
        return of({
          fields,
          error: extractErrorProperties(e),
        } as FieldStatsError);
      }),
      map((resp) => {
        if (!isIKibanaSearchResponse(resp)) return resp;

        const aggregations = resp.rawResponse.aggregations;
        const aggsPath = ['sample'];

        const batchStats: NumericFieldStats[] = [];

        fields.forEach((field, i) => {
          const safeFieldName = field.safeFieldName;
          const docCount = get(
            aggregations,
            [...aggsPath, `${safeFieldName}_field_stats`, 'doc_count'],
            0
          );

          const topAggsPath = [...aggsPath, `${safeFieldName}_top`];

          const fieldAgg = get(aggregations, [...topAggsPath], {}) as { buckets: Bucket[] };
          const { topValuesSampleSize, topValues } = processTopValues(fieldAgg);

          const stats: NumericFieldStats = {
            fieldName: field.fieldName,
            ...processStats(safeFieldName, aggregations, aggsPath),
            isTopValuesSampled:
              isNormalSamplingOption(params.samplingOption) ||
              (isDefined(params.samplingProbability) && params.samplingProbability < 1),
            topValues,
            topValuesSampleSize,
            topValuesSamplerShardSize: get(aggregations, ['sample', 'doc_count']),
          };

          if (docCount > 0) {
            const percentiles = get(
              aggregations,
              [...aggsPath, `${safeFieldName}_percentiles`, 'values'],
              []
            );

            if (percentiles && isDefined(stats.min)) {
              const medianPercentile: { value: number; key: number } | undefined = find(
                percentiles,
                {
                  key: 50,
                }
              );
              stats.median = medianPercentile !== undefined ? medianPercentile!.value : 0;
              stats.distribution = processDistributionData(
                percentiles,
                PERCENTILE_SPACING,
                stats.min
              );
            }
          }

          batchStats.push(stats);
        });

        return batchStats;
      })
    );
};
