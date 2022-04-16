/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract, Logger } from '@kbn/core/server';
import { from, Observable, EMPTY } from 'rxjs';
import { concatMap } from 'rxjs/operators';
import {
  SearchSessionSavedObjectAttributes,
  SEARCH_SESSION_TYPE,
  KueryNode,
} from '@kbn/data-plugin/common';
import { CheckSearchSessionsDeps, CheckSearchSessionsFn, SearchSessionsConfig } from './types';

export interface GetSessionsDeps {
  savedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
}

export function getSearchSessionsPage$(
  { savedObjectsClient }: GetSessionsDeps,
  filter: KueryNode,
  pageSize: number,
  page: number
) {
  return from(
    savedObjectsClient.find<SearchSessionSavedObjectAttributes>({
      page,
      perPage: pageSize,
      type: SEARCH_SESSION_TYPE,
      namespaces: ['*'],
      // process older sessions first
      sortField: 'touched',
      sortOrder: 'asc',
      filter,
    })
  );
}

export const checkSearchSessionsByPage = (
  checkFn: CheckSearchSessionsFn,
  deps: CheckSearchSessionsDeps,
  config: SearchSessionsConfig,
  filters: any,
  nextPage = 1
): Observable<void> =>
  checkFn(deps, config, filters, nextPage).pipe(
    concatMap((result) => {
      if (!result || !result.saved_objects || result.saved_objects.length < config.pageSize) {
        return EMPTY;
      } else {
        // TODO: while processing previous page session list might have been changed and we might skip a session,
        // because it would appear now on a different "page".
        // This isn't critical, as we would pick it up on a next task iteration, but maybe we could improve this somehow
        return checkSearchSessionsByPage(checkFn, deps, config, filters, result.page + 1);
      }
    })
  );
