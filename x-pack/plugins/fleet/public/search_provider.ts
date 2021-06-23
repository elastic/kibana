/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreSetup, CoreStart, ApplicationStart } from 'src/core/public';

import type { Observable } from 'rxjs';
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
      // TODO: See https://github.com/elastic/kibana/issues/96134 for details about why we use '#' here. Below should be updated
      // as part of migrating to non-hash based router.
      // prettier-ignore
      path: `${application.getUrlForApp(INTEGRATIONS_PLUGIN_ID)}#${pagePathGetters.integration_details_overview({ pkgkey })[1]}`,
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
    id: 'packages',
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
        const packages = packagesResponse.slice(0, maxResults);

        return packages.flatMap(
          includeAllPackages
            ? (pkg) => toSearchResult(pkg, coreStart.application)
            : (pkg) => {
                if (!term || !pkg.title.toLowerCase().includes(term)) {
                  return [];
                }

                return toSearchResult(pkg, coreStart.application);
              }
        );
      };

      return combineLatest([coreStart$, getPackages$()]).pipe(
        takeUntil(aborted$),
        map(([coreStart, data]) => (data ? toSearchResults(coreStart, data) : []))
      );
    },
  };
};
