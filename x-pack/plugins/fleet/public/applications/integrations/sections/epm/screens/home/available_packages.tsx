/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useState } from 'react';
import { useLocation, useHistory, useParams } from 'react-router-dom';
import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  EuiHorizontalRule,
  EuiFlexItem,
  EuiFlexGrid,
  EuiSpacer,
  EuiCard,
  EuiIcon,
} from '@elastic/eui';

import { useStartServices } from '../../../../hooks';
import { TrackApplicationView } from '../../../../../../../../../../src/plugins/usage_collection/public';

import { pagePathGetters } from '../../../../constants';
import {
  useGetCategories,
  useGetPackages,
  useBreadcrumbs,
  useGetAppendCustomIntegrations,
  useGetReplacementCustomIntegrations,
  useLink,
} from '../../../../hooks';
import { doesPackageHaveIntegrations } from '../../../../services';
import type { PackageList } from '../../../../types';
import { PackageListGrid } from '../../components/package_list_grid';

import type { CustomIntegration } from '../../../../../../../../../../src/plugins/custom_integrations/common';

import type { PackageListItem } from '../../../../types';

import type { IntegrationCardItem } from '../../../../../../../common/types/models';

import { useMergeEprPackagesWithReplacements } from '../../../../hooks/use_merge_epr_with_replacements';

import type { IntegrationPreferenceType } from '../../components/integration_preference';
import { IntegrationPreference } from '../../components/integration_preference';

import { mergeCategoriesAndCount } from './util';
import { ALL_CATEGORY, CategoryFacets } from './category_facets';
import type { CategoryFacet } from './category_facets';

import type { CategoryParams } from '.';
import { getParams, categoryExists, mapToCard } from '.';

function getAllCategoriesFromIntegrations(pkg: PackageListItem) {
  if (!doesPackageHaveIntegrations(pkg)) {
    return pkg.categories;
  }

  const allCategories = pkg.policy_templates?.reduce((accumulator, integration) => {
    return [...accumulator, ...(integration.categories || [])];
  }, pkg.categories || []);

  return _.uniq(allCategories);
}

// Packages can export multiple integrations, aka `policy_templates`
// In the case where packages ship >1 `policy_templates`, we flatten out the
// list of packages by bringing all integrations to top-level so that
// each integration is displayed as its own tile
const packageListToIntegrationsList = (packages: PackageList): PackageList => {
  return packages.reduce((acc: PackageList, pkg) => {
    const {
      policy_templates: policyTemplates = [],
      categories: topCategories = [],
      ...restOfPackage
    } = pkg;

    const topPackage = {
      ...restOfPackage,
      categories: getAllCategoriesFromIntegrations(pkg),
    };

    return [
      ...acc,
      topPackage,
      ...(doesPackageHaveIntegrations(pkg)
        ? policyTemplates.map((integration) => {
            const { name, title, description, icons, categories = [] } = integration;
            const allCategories = [...topCategories, ...categories];
            return {
              ...restOfPackage,
              id: `${restOfPackage.id}-${name}`,
              integration: name,
              title,
              description,
              icons: icons || restOfPackage.icons,
              categories: _.uniq(allCategories),
            };
          })
        : []),
    ];
  }, []);
};

// TODO: clintandrewhall - this component is hard to test due to the hooks, particularly those that use `http`
// or `location` to load data.  Ideally, we'll split this into "connected" and "pure" components.
export const AvailablePackages: React.FC = memo(() => {
  const [preference, setPreference] = useState<IntegrationPreferenceType>('recommended');
  useBreadcrumbs('integrations_all');

  const { http } = useStartServices();
  const addBasePath = http.basePath.prepend;

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
    history.replace(pagePathGetters.integrations_all({ searchTerm: search })[1]);
  }

  const { data: eprPackages, isLoading: isLoadingAllPackages } = useGetPackages({
    category: '',
  });

  const eprIntegrationList = useMemo(
    () => packageListToIntegrationsList(eprPackages?.response || []),
    [eprPackages]
  );

  const { value: replacementCustomIntegrations } = useGetReplacementCustomIntegrations();

  const mergedEprPackages: Array<PackageListItem | CustomIntegration> =
    useMergeEprPackagesWithReplacements(
      preference === 'beats' ? [] : eprIntegrationList,
      preference === 'agent' ? [] : replacementCustomIntegrations || []
    );

  const { loading: isLoadingAppendCustomIntegrations, value: appendCustomIntegrations } =
    useGetAppendCustomIntegrations();

  const eprAndCustomPackages: Array<CustomIntegration | PackageListItem> = [
    ...mergedEprPackages,
    ...(appendCustomIntegrations || []),
  ];

  const cards: IntegrationCardItem[] = eprAndCustomPackages.map((item) => {
    return mapToCard(getAbsolutePath, getHref, item);
  });

  cards.sort((a, b) => {
    return a.title.localeCompare(b.title);
  });

  const { data: eprCategories, isLoading: isLoadingCategories } = useGetCategories({
    include_policy_templates: true,
  });

  const categories = useMemo(() => {
    const eprAndCustomCategories: CategoryFacet[] =
      isLoadingCategories || !eprCategories
        ? []
        : mergeCategoriesAndCount(
            eprCategories.response as Array<{ id: string; title: string; count: number }>,
            cards
          );
    return [
      {
        ...ALL_CATEGORY,
        count: cards.length,
      },
      ...(eprAndCustomCategories ? eprAndCustomCategories : []),
    ] as CategoryFacet[];
  }, [cards, eprCategories, isLoadingCategories]);

  if (!isLoadingCategories && !categoryExists(selectedCategory, categories)) {
    history.replace(pagePathGetters.integrations_all({ category: '', searchTerm: searchParam })[1]);
    return null;
  }

  let controls = [
    <EuiFlexItem grow={false}>
      <EuiHorizontalRule margin="m" />
      <IntegrationPreference initialType={preference} onChange={setPreference} />
    </EuiFlexItem>,
  ];

  if (categories) {
    controls = [
      <EuiFlexItem className="eui-yScrollWithShadows">
        <CategoryFacets
          isLoading={
            isLoadingCategories || isLoadingAllPackages || isLoadingAppendCustomIntegrations
          }
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={({ id }) => {
            setSelectedCategory(id);
          }}
        />
      </EuiFlexItem>,
      ...controls,
    ];
  }

  const filteredCards = cards.filter((c) => {
    if (selectedCategory === '') {
      return true;
    }

    return c.categories.includes(selectedCategory);
  });

  // TODO: Remove this hard coded list of integrations with a suggestion service
  const featuredList = (
    <>
      <EuiFlexGrid columns={3}>
        <EuiFlexItem>
          <TrackApplicationView viewId="integration-card:epr:endpoint:featured">
            <EuiCard
              data-test-subj="integration-card:epr:endpoint:featured"
              icon={<EuiIcon type="logoSecurity" size="xxl" />}
              href={addBasePath('/app/integrations/detail/endpoint/')}
              title={i18n.translate('xpack.fleet.featuredSecurityTitle', {
                defaultMessage: 'Endpoint Security',
              })}
              description={i18n.translate('xpack.fleet.featuredSecurityDesc', {
                defaultMessage:
                  'Protect your hosts with threat prevention, detection, and deep security data visibility.',
              })}
            />
          </TrackApplicationView>
        </EuiFlexItem>
        <EuiFlexItem>
          <TrackApplicationView viewId="integration-card:epr:apm:featured">
            <EuiCard
              data-test-subj="integration-card:epr:apm:featured"
              title={i18n.translate('xpack.fleet.featuredObsTitle', {
                defaultMessage: 'Elastic APM',
              })}
              description={i18n.translate('xpack.fleet.featuredObsDesc', {
                defaultMessage:
                  'Monitor, detect and diagnose complex performance issues from your application.',
              })}
              href={addBasePath('/app/home#/tutorial/apm')}
              icon={<EuiIcon type="logoObservability" size="xxl" />}
            />
          </TrackApplicationView>
        </EuiFlexItem>
        <EuiFlexItem>
          <TrackApplicationView viewId="integration-card:epr:app_search_web_crawler:featured">
            <EuiCard
              data-test-sub="integration-card:epr:app_search_web_crawler:featured"
              icon={<EuiIcon type="logoAppSearch" size="xxl" />}
              href={addBasePath('/app/enterprise_search/app_search')}
              title={i18n.translate('xpack.fleet.featuredSearchTitle', {
                defaultMessage: 'Web site crawler',
              })}
              description={i18n.translate('xpack.fleet.featuredSearchDesc', {
                defaultMessage: 'Add search to your website with the App Search web crawler.',
              })}
            />
          </TrackApplicationView>
        </EuiFlexItem>
      </EuiFlexGrid>
      <EuiSpacer size="xl" />
    </>
  );

  return (
    <PackageListGrid
      featuredList={featuredList}
      isLoading={isLoadingAllPackages}
      controls={controls}
      initialSearch={searchParam}
      list={filteredCards}
      setSelectedCategory={setSelectedCategory}
      onSearchChange={setSearchTerm}
      showMissingIntegrationMessage
    />
  );
});
