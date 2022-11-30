/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { from, of, merge, zip } from 'rxjs';
import fetch from 'node-fetch';
import { URLSearchParams } from 'url';

import { map, takeUntil, filter, first, take } from 'rxjs/operators';
import { GlobalSearchResultProvider } from '@kbn/global-search-plugin/server';
import { mapToResults } from './map_doc_to_result';

export const createDocsResultProvider = (): GlobalSearchResultProvider => {
  return {
    id: 'docsLink',
    find: ({ docs }, { aborted$ }) => {
      if (!docs || docs.length <= 0) return of([]);
      const term = docs[0];

      const kibanaDocsUrl = `https://www.elastic.co/guide/en/kibana/current/${term}.html`;
      const kibanaDocsResponsePromise = fetch(kibanaDocsUrl);

      const searchUrl = new URL('https://www.elastic.co/search');
      searchUrl.search = new URLSearchParams([
        ['q', term],
        ['filters[0][field]', 'website_area'],
        ['filters[0][values][0]', 'documentation'],
      ]).toString();
      const searchResponsePromise = fetch(searchUrl);

      return zip(from(kibanaDocsResponsePromise), from(searchResponsePromise)).pipe(
        takeUntil(aborted$),
        map(([res1, res2]) =>
          res1.status === 200 ? mapToResults(term ?? '', res1) : mapToResults(term ?? '', res2)
        )
      );
    },
    getSearchableTypes: () => [],
  };
};
