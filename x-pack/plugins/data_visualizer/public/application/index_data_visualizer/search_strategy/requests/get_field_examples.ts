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
import { buildBaseFilterCriteria } from '../../../../../common/utils/query_utils';
import { isPopulatedObject } from '../../../../../common/utils/object_utils';
import type {
  Field,
  FieldExamples,
  FieldStatsCommonRequestParams,
} from '../../../../../common/types/field_stats';
import {
  DataPublicPluginStart,
  IKibanaSearchRequest,
  IKibanaSearchResponse,
  ISearchOptions,
} from '../../../../../../../../src/plugins/data/public';
import { FieldStatsError, isIKibanaSearchResponse } from '../../../../../common/types/field_stats';
import { extractErrorProperties } from '../../utils/error_utils';
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

export const fetchFieldExamples = (
  data: DataPublicPluginStart,
  params: FieldStatsCommonRequestParams,
  field: Field,
  options: ISearchOptions
): Observable<FieldExamples | FieldStatsError> => {
  const request: SearchRequest = getFieldExamplesRequest(params, field);
  const { maxExamples } = params;
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
        const body = resp.rawResponse;
        const stats = {
          fieldName: field.fieldName,
          examples: [] as any[],
        } as FieldExamples;
        if (body.hits.total.value > 0) {
          const hits = body.hits.hits;
          for (let i = 0; i < hits.length; i++) {
            // Use lodash get() to support field names containing dots.
            const doc: object[] | undefined = get(hits[i].fields, field.fieldName);
            // the results from fields query is always an array
            if (Array.isArray(doc) && doc.length > 0) {
              const example = doc[0];
              if (example !== undefined && stats.examples.indexOf(example) === -1) {
                stats.examples.push(example);
                if (stats.examples.length === maxExamples) {
                  break;
                }
              }
            }
          }
        }

        return of(stats);
      })
    );
};
