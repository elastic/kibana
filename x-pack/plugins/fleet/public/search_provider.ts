/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreSetup, CoreStart } from 'src/core/public';

import { from, of, combineLatest } from 'rxjs';
import { map, shareReplay, takeUntil } from 'rxjs/operators';

import type {
  GlobalSearchResultProvider,
  GlobalSearchProviderResult,
} from '../../global_search/public';

import { INTEGRATIONS_PLUGIN_ID } from '../common';

import { sendGetPackages } from './hooks';
import type { GetPackagesResponse } from './types';
import { pagePathGetters } from './constants';

const packageType = 'package';

export const createPackageSearchProvider = (core: CoreSetup): GlobalSearchResultProvider => {
  const coreStart$ = from(core.getStartServices().then(([coreStart]) => coreStart)).pipe(
    shareReplay(1)
  );
  return {
    id: 'packages',
    getSearchableTypes: () => [packageType],
    find: ({ term }, { maxResults, aborted$ }) => {
      if (!term) {
        return of([]);
      }

      term = term.toLowerCase();

      const toSearchResults = (
        coreStart: CoreStart,
        packagesResponse: GetPackagesResponse
      ): GlobalSearchProviderResult[] => {
        const packages = packagesResponse.response.slice(0, maxResults);

        return packages.flatMap((pkg) => {
          if (!term || !pkg.title.toLowerCase().includes(term)) {
            return [];
          }
          const pkgkey = `${pkg.name}-${pkg.version}`;
          return {
            id: pkgkey,
            type: packageType,
            title: pkg.title,
            score: 80,
            url: {
              // prettier-ignore
              path: `${coreStart.application.getUrlForApp(INTEGRATIONS_PLUGIN_ID)}#${pagePathGetters.integration_details_overview({ pkgkey })[1]}`,
              prependBasePath: false,
            },
          };
        });
      };

      return combineLatest([coreStart$, from(sendGetPackages())]).pipe(
        takeUntil(aborted$),
        map(([coreStart, { data }]) => (data ? toSearchResults(coreStart, data) : []))
      );
    },
  };
};
