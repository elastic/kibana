/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreSetup, CoreStart, ApplicationStart, IBasePath } from '@kbn/core/public';

import type { Observable } from 'rxjs';
import { from, of, combineLatest } from 'rxjs';
import { map, shareReplay, takeUntil } from 'rxjs';

import type {
  GlobalSearchResultProvider,
  GlobalSearchProviderResult,
} from '@kbn/global-search-plugin/public';

import { INTEGRATIONS_PLUGIN_ID } from '../common';
import { filterPolicyTemplatesTiles } from '../common/services';

import { sendGetPackages } from './hooks';
import type { GetPackagesResponse, PackageListItem } from './types';
import { pagePathGetters } from './constants';
import { getEuiIconType } from './services/icons';

const packageType = 'integration';

const createPackages$ = () =>
  from(sendGetPackages()).pipe(
    map(({ error, data }) => {
      if (error) {
        throw error;
      }
      return data?.items ?? [];
    }),
    shareReplay(1)
  );

/** Exported for testing only @internal */
export const toSearchResult = (
  pkg: PackageListItem,
  application: ApplicationStart,
  basePath: IBasePath
): GlobalSearchProviderResult[] => {
  const packageResult = {
    id: pkg.name,
    type: packageType,
    title: pkg.title,
    score: 80,
    icon: getEuiIconType(pkg, basePath),
    url: {
      path: `${application.getUrlForApp(INTEGRATIONS_PLUGIN_ID)}${
        pagePathGetters.integration_details_overview({ pkgkey: pkg.name })[1]
      }`,
      prependBasePath: false,
    },
  };

  const policyTemplateResults = pkg.policy_templates?.map<GlobalSearchProviderResult>(
    (policyTemplate) => ({
      id: policyTemplate.name,
      type: packageType,
      title: policyTemplate.title,
      score: 80,
      icon: getEuiIconType(pkg, basePath, policyTemplate),
      url: {
        path: `${application.getUrlForApp(INTEGRATIONS_PLUGIN_ID)}${
          pagePathGetters.integration_details_overview({
            pkgkey: pkg.name,
            integration: policyTemplate.name,
          })[1]
        }`,
        prependBasePath: false,
      },
    })
  );

  const tiles = filterPolicyTemplatesTiles<GlobalSearchProviderResult>(
    pkg.policy_templates_behavior,
    packageResult,
    policyTemplateResults || []
  );
  return [...tiles];
};

export const createPackageSearchProvider = (core: CoreSetup): GlobalSearchResultProvider => {
  const coreStart$ = from(core.getStartServices()).pipe(
    map(([coreStart]) => coreStart),
    shareReplay(1)
  );

  let packages$: undefined | Observable<GetPackagesResponse['items']>;

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
        packagesResponse: GetPackagesResponse['items']
      ): GlobalSearchProviderResult[] => {
        return packagesResponse
          .flatMap(
            includeAllPackages
              ? (pkg) => toSearchResult(pkg, coreStart.application, coreStart.http.basePath)
              : (pkg) => {
                  if (!term) {
                    return [];
                  }

                  return toSearchResult(pkg, coreStart.application, coreStart.http.basePath).filter(
                    (res) => term && res.title.toLowerCase().includes(term)
                  );
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
