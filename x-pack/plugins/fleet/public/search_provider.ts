/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Observable } from 'rxjs';
import { combineLatest, from, of } from 'rxjs';
import { map, shareReplay, takeUntil } from 'rxjs/operators';

import type { CoreSetup, CoreStart } from '../../../../src/core/public/types';
import type { ApplicationStart } from '../../../../src/core/public/application/types';
import type { GlobalSearchProviderResult } from '../../global_search/common/types';
import type { GlobalSearchResultProvider } from '../../global_search/public/types';
import { INTEGRATIONS_PLUGIN_ID } from '../common/constants/plugin';
import type { GetPackagesResponse } from '../common/types/rest_spec/epm';

import { pagePathGetters } from './constants/page_paths';
import { sendGetPackages } from './hooks/use_request/epm';

const packageType = 'integration';

const createPackages$ = () =>
  from(sendGetPackages()).pipe(
    map(({ error, data }) => {
      if (error) {
        throw error;
      }
      return data?.response ?? [];
    }),
    shareReplay(1)
  );

const toSearchResult = (
  pkg: GetPackagesResponse['response'][number],
  application: ApplicationStart
) => {
  const pkgkey = `${pkg.name}-${pkg.version}`;
  return {
    id: pkgkey,
    type: packageType,
    title: pkg.title,
    score: 80,
    url: {
      // prettier-ignore
      path: `${application.getUrlForApp(INTEGRATIONS_PLUGIN_ID)}${pagePathGetters.integration_details_overview({ pkgkey })[1]}`,
      prependBasePath: false,
    },
  };
};

export const createPackageSearchProvider = (core: CoreSetup): GlobalSearchResultProvider => {
  const coreStart$ = from(core.getStartServices()).pipe(
    map(([coreStart]) => coreStart),
    shareReplay(1)
  );

  let packages$: undefined | Observable<GetPackagesResponse['response']>;

  const getPackages$ = () => {
    if (!packages$) {
      packages$ = createPackages$();
    }
    return packages$;
  };

  return {
    id: 'integrations',
    getSearchableTypes: () => [packageType],
    find: ({ term, types }, { maxResults, aborted$ }) => {
      if (types?.includes(packageType) === false) {
        return of([]);
      }

      const hasTypes = Boolean(types);
      const typesIncludePackage = hasTypes && types!.includes(packageType);
      const noSearchTerm = !term;
      const includeAllPackages = typesIncludePackage && noSearchTerm;

      if (!includeAllPackages && noSearchTerm) {
        return of([]);
      }

      if (term) {
        term = term.toLowerCase();
      }

      const toSearchResults = (
        coreStart: CoreStart,
        packagesResponse: GetPackagesResponse['response']
      ): GlobalSearchProviderResult[] => {
        return packagesResponse
          .flatMap(
            includeAllPackages
              ? (pkg) => toSearchResult(pkg, coreStart.application)
              : (pkg) => {
                  if (!term || !pkg.title.toLowerCase().includes(term)) {
                    return [];
                  }

                  return toSearchResult(pkg, coreStart.application);
                }
          )
          .slice(0, maxResults);
      };

      return combineLatest([coreStart$, getPackages$()]).pipe(
        takeUntil(aborted$),
        map(([coreStart, data]) => (data ? toSearchResults(coreStart, data) : []))
      );
    },
  };
};
