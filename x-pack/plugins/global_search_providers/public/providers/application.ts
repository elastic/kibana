/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { from } from 'rxjs';
import { take, map, takeUntil, mergeMap } from 'rxjs/operators';
import { ApplicationStart } from 'src/core/public';
import { GlobalSearchResultProvider } from '../../../global_search/public';
import { getAppResults } from './get_app_results';

export const createApplicationResultProvider = (
  applicationPromise: Promise<ApplicationStart>
): GlobalSearchResultProvider => {
  return {
    id: 'application',
    find: (term, { aborted$, maxResults }) => {
      return from(applicationPromise).pipe(
        mergeMap((application) => application.applications$),
        takeUntil(aborted$),
        take(1),
        map((apps) => {
          const results = getAppResults(term, [...apps.values()]);
          return results.sort((a, b) => b.score - a.score).slice(0, maxResults);
        })
      );
    },
  };
};
