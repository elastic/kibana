/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { from, of } from 'rxjs';
import { take, map, takeUntil, mergeMap, shareReplay } from 'rxjs/operators';
import { ApplicationStart } from '@kbn/core/public';
import { GlobalSearchResultProvider } from '@kbn/global-search-plugin/public';
import { getAppResults } from './get_app_results';

const applicationType = 'application';

export const createApplicationResultProvider = (
  applicationPromise: Promise<ApplicationStart>
): GlobalSearchResultProvider => {
  const searchableApps$ = from(applicationPromise).pipe(
    mergeMap((application) => application.applications$),
    map((apps) =>
      [...apps.values()].filter(
        // only include non-chromeless enabled apps
        (app) => app.status === 0 && app.chromeless !== true
      )
    ),
    shareReplay(1)
  );

  return {
    id: 'application',
    find: ({ term, types, tags }, { aborted$, maxResults }) => {
      if (tags || (types && !types.includes(applicationType))) {
        return of([]);
      }
      return searchableApps$.pipe(
        takeUntil(aborted$),
        take(1),
        map((apps) => {
          const results = getAppResults(term ?? '', [...apps.values()]);
          return results.sort((a, b) => b.score - a.score).slice(0, maxResults);
        })
      );
    },
    getSearchableTypes: () => [applicationType],
  };
};
