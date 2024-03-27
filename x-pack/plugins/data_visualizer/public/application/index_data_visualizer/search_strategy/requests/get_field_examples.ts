/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { get } from 'lodash';
import { combineLatest, of } from 'rxjs';
import { catchError, map } from 'rxjs';
import type {
  IKibanaSearchRequest,
  IKibanaSearchResponse,
  ISearchOptions,
  ISearchStart,
} from '@kbn/data-plugin/public';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { buildBaseFilterCriteria } from '@kbn/ml-query-utils';
import { extractErrorProperties } from '@kbn/ml-error-utils';
import { getUniqGeoOrStrExamples } from '../../../common/util/example_utils';
import type {
  Field,
  FieldExamples,
  FieldStatsCommonRequestParams,
  FieldStatsError,
} from '../../../../../common/types/field_stats';
import { isIKibanaSearchResponse } from '../../../../../common/types/field_stats';
import { MAX_EXAMPLES_DEFAULT } from './constants';

export const getFieldExamplesRequest = (params: FieldStatsCommonRequestParams, field: Field) => {
  const { index, timeFieldName, earliestMs, latestMs, query, runtimeFieldMap, maxExamples } =
    params;

  // Request at least 100 docs so that we have a chance of obtaining
  // 'maxExamples' of the field.
  const size = Math.max(100, maxExamples ?? MAX_EXAMPLES_DEFAULT);
  const filterCriteria = buildBaseFilterCriteria(timeFieldName, earliestMs, latestMs, query);

  // Use an exists filter to return examples of the field.
  if (Array.isArray(filterCriteria)) {
    filterCriteria.push({
      exists: { field: field.fieldName },
    });
  }

  const searchBody = {
    fields: [field.fieldName],
    _source: false,
    query: {
      bool: {
        filter: filterCriteria,
      },
    },
    ...(isPopulatedObject(runtimeFieldMap) ? { runtime_mappings: runtimeFieldMap } : {}),
  };

  return {
    index,
    size,
    body: searchBody,
  };
};

export const fetchFieldsExamples = (
  dataSearch: ISearchStart,
  params: FieldStatsCommonRequestParams,
  fields: Field[],
  options: ISearchOptions
) => {
  const { maxExamples } = params;
  return combineLatest(
    fields.map((field) => {
      const request: estypes.SearchRequest = getFieldExamplesRequest(params, field);

      return dataSearch
        .search<IKibanaSearchRequest, IKibanaSearchResponse>({ params: request }, options)
        .pipe(
          catchError((e) =>
            of({
              fieldName: field.fieldName,
              fields,
              error: extractErrorProperties(e),
            } as FieldStatsError)
          ),
          map((resp) => {
            if (!isIKibanaSearchResponse(resp)) return resp;
            const body = resp.rawResponse;
            const stats = {
              fieldName: field.fieldName,
              examples: [] as unknown[],
            } as FieldExamples;

            if (body.hits.total > 0) {
              const hits = body.hits.hits;
              const processedDocs = hits.map((hit: SearchHit) => {
                const doc: object[] | undefined = get(hit.fields, field.fieldName);
                return Array.isArray(doc) && doc.length > 0 ? doc[0] : doc;
              });
              stats.examples = getUniqGeoOrStrExamples(processedDocs, maxExamples);
            }

            return stats;
          })
        );
    })
  );
};
