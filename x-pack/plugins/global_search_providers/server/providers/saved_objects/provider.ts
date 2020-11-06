/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { from, combineLatest, of } from 'rxjs';
import { map, takeUntil, first } from 'rxjs/operators';
import { GlobalSearchResultProvider } from '../../../../global_search/server';
import { mapToResults } from './map_object_to_result';

export const createSavedObjectsResultProvider = (): GlobalSearchResultProvider => {
  return {
    id: 'savedObjects',
    find: (term, { aborted$, maxResults, preference }, { core }) => {
      if (!term) {
        return of([]);
      }

      const {
        capabilities,
        savedObjects: { client, typeRegistry },
      } = core;

      const searchableTypes = typeRegistry
        .getVisibleTypes()
        .filter((type) => type.management?.defaultSearchField && type.management?.getInAppUrl);
      const searchFields = uniq(
        searchableTypes.map((type) => type.management!.defaultSearchField!)
      );

      const responsePromise = client.find({
        page: 1,
        perPage: maxResults,
        search: term ? `${term}*` : undefined,
        preference,
        searchFields,
        type: searchableTypes.map((type) => type.name),
      });

      return combineLatest([from(responsePromise), capabilities.pipe(first())]).pipe(
        takeUntil(aborted$),
        map(([res, cap]) => mapToResults(res.saved_objects, typeRegistry, cap))
      );
    },
  };
};

const uniq = <T>(values: T[]): T[] => [...new Set(values)];
