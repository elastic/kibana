/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fetch from 'node-fetch';
import { from, of, zip, filter } from 'rxjs';
import { URLSearchParams } from 'url';
import { map, takeUntil } from 'rxjs/operators';

import { GlobalSearchResultProvider } from '@kbn/global-search-plugin/server';

import { mapToResults } from './map_doc_to_result';

export const createDocsResultProvider = (): GlobalSearchResultProvider => {
  return {
    id: 'docsLink',
    find: ({ docs, term }, { aborted$ }) => {
      if (docs && docs.length > 0) {
        const searchTerm = docs[0];

        const kibanaDocsUrl = `https://www.elastic.co/guide/en/kibana/current/${searchTerm}.html`;
        const kibanaDocsResponsePromise = fetch(kibanaDocsUrl);

        const searchUrl = new URL('https://www.elastic.co/search');
        searchUrl.search = new URLSearchParams([
          ['q', searchTerm],
          ['filters[0][field]', 'website_area'],
          ['filters[0][values][0]', 'documentation'],
        ]).toString();
        const searchResponsePromise = fetch(searchUrl);

        return zip(from(kibanaDocsResponsePromise), from(searchResponsePromise)).pipe(
          takeUntil(aborted$),
          map(([res1, res2]) =>
            res1.status === 200
              ? mapToResults('kibana', searchTerm ?? '', res1)
              : mapToResults('search', searchTerm ?? '', res2)
          )
        );
      }

      if (term && term.toLowerCase().includes('doc')) {
        const mainDocsUrl = new URL('https://www.elastic.co/guide/index.html');
        const mainDocsResponsePromise = fetch(mainDocsUrl);

        return from(mainDocsResponsePromise).pipe(
          takeUntil(aborted$),
          filter((res) => res.status === 200),
          map((res) => mapToResults('default', term ?? '', res))
        );
      }

      return of([]);
    },
    getSearchableTypes: () => [],
  };
};
