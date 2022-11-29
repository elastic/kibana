/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { from, of } from 'rxjs';
import fetch from 'node-fetch';
import { map, takeUntil, filter } from 'rxjs/operators';
import { GlobalSearchResultProvider } from '@kbn/global-search-plugin/server';
import { mapToResults } from './map_doc_to_result';

export const createDocsResultProvider = (): GlobalSearchResultProvider => {
  return {
    id: 'docsLink',
    find: ({ docs }, { aborted$ }) => {
      if (!docs || docs.length <= 0) return of([]);
      const term = docs[0].toLowerCase();

      const responsePromise = fetch(`https://www.elastic.co/guide/en/kibana/current/${term}.html`);

      return from(responsePromise).pipe(
        takeUntil(aborted$),
        filter((res) => res.status === 200),
        map((res) => mapToResults(term ?? '', res))
      );
    },
    getSearchableTypes: () => [],
  };
};
