/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { from, combineLatest, of } from 'rxjs';
import { map, takeUntil, first } from 'rxjs/operators';
import { SavedObjectsFindOptionsReference, ISavedObjectTypeRegistry } from 'src/core/server';
import { GlobalSearchResultProvider } from '../../../../global_search/server';
import { mapToResults } from './map_object_to_result';

export const createSavedObjectsResultProvider = (): GlobalSearchResultProvider => {
  return {
    id: 'savedObjects',
    find: ({ term, types, tags }, { aborted$, maxResults, preference }, { core }) => {
      if (!term && !types && !tags) {
        return of([]);
      }

      const {
        capabilities,
        savedObjects: { client, typeRegistry },
      } = core;

      const searchableTypes = getSearchableTypes(typeRegistry, types);

      const searchFields = uniq(
        searchableTypes.map((type) => type.management!.defaultSearchField!)
      );

      const references: SavedObjectsFindOptionsReference[] | undefined = tags
        ? tags.map((tagId) => ({ type: 'tag', id: tagId }))
        : undefined;

      const responsePromise = client.find({
        page: 1,
        perPage: maxResults,
        search: term ? `${term}*` : undefined,
        ...(references ? { hasReference: references } : {}),
        preference,
        searchFields,
        type: searchableTypes.map((type) => type.name),
      });

      return combineLatest([from(responsePromise), capabilities.pipe(first())]).pipe(
        takeUntil(aborted$),
        map(([res, cap]) => mapToResults(res.saved_objects, typeRegistry, cap))
      );
    },
    getSearchableTypes: ({ core }) => {
      const {
        savedObjects: { typeRegistry },
      } = core;
      return getSearchableTypes(typeRegistry).map((type) => type.name);
    },
  };
};

const getSearchableTypes = (typeRegistry: ISavedObjectTypeRegistry, types?: string[]) =>
  typeRegistry
    .getVisibleTypes()
    .filter(types ? (type) => includeIgnoreCase(types, type.name) : () => true)
    .filter((type) => type.management?.defaultSearchField && type.management?.getInAppUrl);

const uniq = <T>(values: T[]): T[] => [...new Set(values)];

const includeIgnoreCase = (list: string[], item: string) =>
  list.find((e) => e.toLowerCase() === item.toLowerCase()) !== undefined;
