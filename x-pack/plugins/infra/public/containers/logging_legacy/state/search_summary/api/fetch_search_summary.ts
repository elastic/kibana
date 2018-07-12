/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import {
  SearchSummaryApiPostPayload,
  SearchSummaryApiPostResponse,
} from '../../../../../../common/http_api';
import { LogEntryFieldsMapping } from '../../../../../../common/log_entry';
import { SearchSummaryBucket } from '../../../../../../common/log_search_summary';
import { getElasticSearchTimeUnit, TimeScale } from '../../../../../../common/time';
import { InfraObservableApi } from '../../../../../lib/lib';

export interface CommonFetchSearchSummaryDependencies<State> {
  postToApi$: Observable<InfraObservableApi['post']>;
  selectSourceCoreFields: (state: State) => LogEntryFieldsMapping;
  selectSourceIndices: (state: State) => string[];
}

export type FetchSearchSummaryResult = Observable<SearchSummaryBucket[]>;

export const fetchSearchSummary$ = (
  postToApi: InfraObservableApi['post'],
  indices: string[],
  fields: LogEntryFieldsMapping,
  start: number,
  end: number,
  bucketSize: TimeScale,
  query: string
): FetchSearchSummaryResult =>
  postToApi<SearchSummaryApiPostPayload, SearchSummaryApiPostResponse>({
    body: {
      bucketSize: {
        unit: getElasticSearchTimeUnit(bucketSize.unit),
        value: bucketSize.value,
      },
      end,
      fields,
      indices,
      query,
      start,
    },
    url: `logging/search-summary`,
  }).pipe(map(({ response }) => response.buckets));
