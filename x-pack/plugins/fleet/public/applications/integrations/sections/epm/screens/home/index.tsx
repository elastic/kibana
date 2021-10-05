/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { Switch, Route, useLocation, useHistory, useParams } from 'react-router-dom';
import semverLt from 'semver/functions/lt';
import { i18n } from '@kbn/i18n';

import { installationStatuses } from '../../../../../../../common/constants';
import type { DynamicPage, DynamicPagePathValues, StaticPage } from '../../../../constants';
import {
  INTEGRATIONS_ROUTING_PATHS,
  INTEGRATIONS_SEARCH_QUERYPARAM,
  pagePathGetters,
} from '../../../../constants';
import {
  useGetCategories,
  useGetPackages,
  useBreadcrumbs,
  useGetAppendCustomIntegrations,
  useGetReplacementCustomIntegrations,
  useLink,
} from '../../../../hooks';
import { doesPackageHaveIntegrations } from '../../../../services';
import { DefaultLayout } from '../../../../layouts';
import type { PackageList } from '../../../../types';
import { PackageListGrid } from '../../components/package_list_grid';

import type { CustomIntegration } from '../../../../../../../../../../src/plugins/custom_integrations/common';

import type { PackageListItem } from '../../../../types';

import type { IntegrationCardItem } from '../../../../../../../common/types/models';

import type { IntegrationCategory } from '../../../../../../../../../../src/plugins/custom_integrations/common';

import { useMergeEprPackagesWithReplacements } from '../../../../../../hooks/use_merge_epr_with_replacements';

import { mergeAndReplaceCategoryCounts } from './util';
import { CategoryFacets } from './category_facets';
import type { CategoryFacet } from './category_facets';

export interface CategoryParams {
  category?: string;
}

function getParams(params: CategoryParams, search: string) {
  const { category } = params;
  const selectedCategory = category || '';
  const queryParams = new URLSearchParams(search);
  const searchParam = queryParams.get(INTEGRATIONS_SEARCH_QUERYPARAM) || '';
  return { selectedCategory, searchParam };
}

function categoryExists(category: string, categories: CategoryFacet[]) {
  return categories.some((c) => c.id === category);
}

function mapToCard(
  getAbsolutePath: (p: string) => string,
  getHref: (page: StaticPage | DynamicPage, values?: DynamicPagePathValues) => string,
  item: CustomIntegration | PackageListItem
): IntegrationCardItem {
  let uiInternalPathUrl;
  if (item.type === 'ui_link') {
    uiInternalPathUrl = getAbsolutePath(item.uiInternalPath);
  } else {
    let urlVersion = item.version;
    if ('savedObject' in item) {
      urlVersion = item.savedObject.attributes.version || item.version;
    }
    const url = getHref('integration_details_overview', {
      pkgkey: `${item.name}-${urlVersion}`,
      ...(item.integration ? { integration: item.integration } : {}),
    });
    uiInternalPathUrl = url;
  }

  return {
    id: `${item.type === 'ui_link' ? 'ui_link' : 'epr'}-${item.id}`,
    description: item.description,
    icons: !item.icons || !item.icons.length ? [] : item.icons,
    integration: 'integration' in item ? item.integration || '' : '',
    name: 'name' in item ? item.name || '' : '',
    title: item.title,
    version: 'version' in item ? item.version || '' : '',
    release: 'release' in item ? item.release : undefined,
    url: uiInternalPathUrl,
  };
}

export const EPMHomePage: React.FC = memo(() => {
  return (
    <Switch>
      <Route path={INTEGRATIONS_ROUTING_PATHS.integrations_installed}>
        <DefaultLayout section="manage">
          <InstalledPackages />
        </DefaultLayout>
      </Route>
      <Route path={INTEGRATIONS_ROUTING_PATHS.integrations_all}>
        <DefaultLayout section="browse">
          <AvailablePackages />
        </DefaultLayout>
      </Route>
    </Switch>
  );
});

// Packages can export multiple integrations, aka `policy_templates`
// In the case where packages ship >1 `policy_templates`, we flatten out the
// list of packages by bringing all integrations to top-level so that
// each integration is displayed as its own tile
const packageListToIntegrationsList = (packages: PackageList): PackageList => {
  return packages.reduce((acc: PackageList, pkg) => {
    const { policy_templates: policyTemplates = [], ...restOfPackage } = pkg;
    return [
      ...acc,
      restOfPackage,
      ...(doesPackageHaveIntegrations(pkg)
        ? policyTemplates.map((integration) => {
            const { name, title, description, icons } = integration;
            return {
              ...restOfPackage,
              id: `${restOfPackage}-${name}`,
              integration: name,
              title,
              description,
              icons: icons || restOfPackage.icons,
            };
          })
        : []),
    ];
  }, []);
};

const InstalledPackages: React.FC = memo(() => {
  useBreadcrumbs('integrations_installed');
  const { data: allPackages, isLoading: isLoadingPackages } = useGetPackages({
    experimental: true,
  });
  const { getHref, getAbsolutePath } = useLink();

  const { selectedCategory, searchParam } = getParams(
    useParams<CategoryParams>(),
    useLocation().search
  );
  const history = useHistory();
  function setSelectedCategory(categoryId: string) {
    const url = pagePathGetters.integrations_installed({
      category: categoryId,
      searchTerm: searchParam,
    })[1];
    history.push(url);
  }
  function setSearchTerm(search: string) {
    // Use .replace so the browser's back button is not tied to single keystroke
    history.replace(
      pagePathGetters.integrations_installed({
        category: selectedCategory,
        searchTerm: search,
      })[1]
    );
  }

  const allInstalledPackages = useMemo(
    () =>
      (allPackages?.response || []).filter((pkg) => pkg.status === installationStatuses.Installed),
    [allPackages?.response]
  );

  const updatablePackages = useMemo(
    () =>
      allInstalledPackages.filter(
        (item) =>
          'savedObject' in item && semverLt(item.savedObject.attributes.version, item.version)
      ),
    [allInstalledPackages]
  );

  const title = useMemo(
    () =>
      i18n.translate('xpack.fleet.epmList.installedTitle', {
        defaultMessage: 'Installed integrations',
      }),
    []
  );

  const categories: CategoryFacet[] = useMemo(
    () => [
      {
        id: '',
        count: allInstalledPackages.length,
      },
      {
        id: 'updates_available',
        count: updatablePackages.length,
      },
    ],
    [allInstalledPackages.length, updatablePackages.length]
  );

  if (!categoryExists(selectedCategory, categories)) {
    history.replace(
      pagePathGetters.integrations_installed({ category: '', searchTerm: searchParam })[1]
    );
    return null;
  }

  const controls = (
    <CategoryFacets
      showCounts={true}
      categories={categories}
      selectedCategory={selectedCategory}
      onCategoryChange={({ id }: CategoryFacet) => setSelectedCategory(id)}
    />
  );

  const cards = (
    selectedCategory === 'updates_available' ? updatablePackages : allInstalledPackages
  ).map((item) => {
    return mapToCard(getAbsolutePath, getHref, item);
  });

  return (
    <PackageListGrid
      isLoading={isLoadingPackages}
      controls={controls}
      setSelectedCategory={setSelectedCategory}
      onSearchChange={setSearchTerm}
      initialSearch={searchParam}
      title={title}
      list={cards}
    />
  );
});

const AvailablePackages: React.FC = memo(() => {
  useBreadcrumbs('integrations_all');
  const { selectedCategory, searchParam } = getParams(
    useParams<CategoryParams>(),
    useLocation().search
  );
  const history = useHistory();
  const { getHref, getAbsolutePath } = useLink();

  function setSelectedCategory(categoryId: string) {
    const url = pagePathGetters.integrations_all({
      category: categoryId,
      searchTerm: searchParam,
    })[1];
    history.push(url);
  }
  function setSearchTerm(search: string) {
    // Use .replace so the browser's back button is not tied to single keystroke
    history.replace(
      pagePathGetters.integrations_all({ category: selectedCategory, searchTerm: search })[1]
    );
  }

  const { data: allCategoryPackagesRes, isLoading: isLoadingAllPackages } = useGetPackages({
    category: '',
  });
  const { data: categoryPackagesRes, isLoading: isLoadingCategoryPackages } = useGetPackages({
    category: selectedCategory,
  });
  const { data: categoriesRes, isLoading: isLoadingCategories } = useGetCategories({
    include_policy_templates: true,
  });

  const eprPackages = useMemo(
    () => packageListToIntegrationsList(categoryPackagesRes?.response || []),
    [categoryPackagesRes]
  );

  const allEprPackages = useMemo(
    () => packageListToIntegrationsList(allCategoryPackagesRes?.response || []),
    [allCategoryPackagesRes]
  );

  const { value: replacementCustomIntegrations } = useGetReplacementCustomIntegrations();

  const mergedEprPackages: Array<PackageListItem | CustomIntegration> =
    useMergeEprPackagesWithReplacements(
      eprPackages || [],
      replacementCustomIntegrations || [],
      selectedCategory as IntegrationCategory
    );

  const { loading: isLoadingAppendCustomIntegrations, value: appendCustomIntegrations } =
    useGetAppendCustomIntegrations();
  const filteredAddableIntegrations = appendCustomIntegrations
    ? appendCustomIntegrations.filter((integration: CustomIntegration) => {
        if (!selectedCategory) {
          return true;
        }
        return integration.categories.indexOf(selectedCategory as IntegrationCategory) >= 0;
      })
    : [];

  const title = useMemo(
    () =>
      i18n.translate('xpack.fleet.epmList.allTitle', {
        defaultMessage: 'Browse by category',
      }),
    []
  );

  const eprAndCustomPackages: Array<CustomIntegration | PackageListItem> = [
    ...mergedEprPackages,
    ...filteredAddableIntegrations,
  ];
  eprAndCustomPackages.sort((a, b) => {
    return a.title.localeCompare(b.title);
  });

  const categories = useMemo(() => {
    const eprAndCustomCategories: CategoryFacet[] =
      isLoadingCategories ||
      isLoadingAppendCustomIntegrations ||
      !appendCustomIntegrations ||
      !categoriesRes
        ? []
        : mergeAndReplaceCategoryCounts(
            categoriesRes.response as CategoryFacet[],
            appendCustomIntegrations
          );
    return [
      {
        id: '',
        count: (allEprPackages?.length || 0) + (appendCustomIntegrations?.length || 0),
      },
      ...(eprAndCustomCategories ? eprAndCustomCategories : []),
    ] as CategoryFacet[];
  }, [
    allEprPackages?.length,
    appendCustomIntegrations,
    categoriesRes,
    isLoadingAppendCustomIntegrations,
    isLoadingCategories,
  ]);

  if (!isLoadingCategories && !categoryExists(selectedCategory, categories)) {
    history.replace(pagePathGetters.integrations_all({ category: '', searchTerm: searchParam })[1]);
    return null;
  }

  const controls = categories ? (
    <CategoryFacets
      showCounts={false}
      isLoading={isLoadingCategories || isLoadingAllPackages || isLoadingAppendCustomIntegrations}
      categories={categories}
      selectedCategory={selectedCategory}
      onCategoryChange={({ id }: CategoryFacet) => {
        setSelectedCategory(id);
      }}
    />
  ) : null;

  const cards = eprAndCustomPackages.map((item) => {
    return mapToCard(getAbsolutePath, getHref, item);
  });

  return (
    <PackageListGrid
      isLoading={isLoadingCategoryPackages}
      title={title}
      controls={controls}
      initialSearch={searchParam}
      list={cards}
      setSelectedCategory={setSelectedCategory}
      onSearchChange={setSearchTerm}
      showMissingIntegrationMessage
    />
  );
});
