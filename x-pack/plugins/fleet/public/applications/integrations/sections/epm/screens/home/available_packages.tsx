/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useMemo, useState } from 'react';
import { useLocation, useHistory, useParams } from 'react-router-dom';
import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiHorizontalRule,
  EuiFlexItem,
  EuiFlexGrid,
  EuiSpacer,
  EuiCard,
  EuiIcon,
  EuiCallOut,
  EuiLink,
} from '@elastic/eui';

import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';

import type { CustomIntegration } from '@kbn/custom-integrations-plugin/common';

import {
  isInputOnlyPolicyTemplate,
  isIntegrationPolicyTemplate,
} from '../../../../../../../common/services';

import { useStartServices } from '../../../../hooks';

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
import type { GetPackagesResponse, PackageList } from '../../../../types';
import { PackageListGrid } from '../../components/package_list_grid';

import type { PackageListItem } from '../../../../types';

import type { IntegrationCardItem } from '../../../../../../../common/types/models';

import { useMergeEprPackagesWithReplacements } from '../../../../hooks/use_merge_epr_with_replacements';

import type { IntegrationPreferenceType } from '../../components/integration_preference';
import { IntegrationPreference } from '../../components/integration_preference';

import { mergeCategoriesAndCount } from './util';
import { ALL_CATEGORY, CategoryFacets } from './category_facets';
import type { CategoryFacet, ExtendedIntegrationCategory } from './category_facets';

import type { CategoryParams } from '.';
import { getParams, categoryExists, mapToCard } from '.';

const NoEprCallout: FunctionComponent<{ statusCode?: number }> = ({
  statusCode,
}: {
  statusCode?: number;
}) => {
  let titleMessage;
  let descriptionMessage;
  if (statusCode === 502) {
    titleMessage = i18n.translate('xpack.fleet.epmList.eprUnavailableBadGatewayCalloutTitle', {
      defaultMessage:
        'Kibana cannot reach the Elastic Package Registry, which provides Elastic Agent integrations\n',
    });
    descriptionMessage = (
      <FormattedMessage
        id="xpack.fleet.epmList.eprUnavailableCallouBdGatewaytTitleMessage"
        defaultMessage="To view these integrations, configure a  {registryproxy} or host {onpremregistry}."
        values={{
          registryproxy: <ProxyLink />,
          onpremregistry: <OnPremLink />,
        }}
      />
    );
  } else {
    titleMessage = i18n.translate('xpack.fleet.epmList.eprUnavailable400500CalloutTitle', {
      defaultMessage:
        'Kibana cannot connect to the Elastic Package Registry, which provides Elastic Agent integrations\n',
    });
    descriptionMessage = (
      <FormattedMessage
        id="xpack.fleet.epmList.eprUnavailableCallout400500TitleMessage"
        defaultMessage="Ensure the {registryproxy} or {onpremregistry} is configured correctly, or try again later."
        values={{
          registryproxy: <ProxyLink />,
          onpremregistry: <OnPremLink />,
        }}
      />
    );
  }

  return (
    <EuiCallOut title={titleMessage} iconType="iInCircle" color={'warning'}>
      <p>{descriptionMessage}</p>
    </EuiCallOut>
  );
};

function ProxyLink() {
  const { docLinks } = useStartServices();

  return (
    <EuiLink href={docLinks.links.fleet.settingsFleetServerProxySettings} target="_blank">
      {i18n.translate('xpack.fleet.epmList.proxyLinkSnippedText', {
        defaultMessage: 'proxy server',
      })}
    </EuiLink>
  );
}

function OnPremLink() {
  const { docLinks } = useStartServices();

  return (
    <EuiLink href={docLinks.links.fleet.onPremRegistry} target="_blank">
      {i18n.translate('xpack.fleet.epmList.onPremLinkSnippetText', {
        defaultMessage: 'your own registry',
      })}
    </EuiLink>
  );
}

function getAllCategoriesFromIntegrations(pkg: PackageListItem) {
  if (!doesPackageHaveIntegrations(pkg)) {
    return pkg.categories;
  }

  const allCategories = pkg.policy_templates?.reduce((accumulator, policyTemplate) => {
    if (isInputOnlyPolicyTemplate(policyTemplate)) {
      // input only policy templates do not have categories
      return accumulator;
    }
    return [...accumulator, ...(policyTemplate.categories || [])];
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
        ? policyTemplates.map((policyTemplate) => {
            const { name, title, description, icons } = policyTemplate;

            const categories =
              isIntegrationPolicyTemplate(policyTemplate) && policyTemplate.categories
                ? policyTemplate.categories
                : [];
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
export const AvailablePackages: React.FC<{
  allPackages?: GetPackagesResponse | null;
  isLoading: boolean;
}> = ({ allPackages, isLoading }) => {
  const [preference, setPreference] = useState<IntegrationPreferenceType>('recommended');

  useBreadcrumbs('integrations_all');

  const { http } = useStartServices();
  const addBasePath = http.basePath.prepend;

  const { selectedCategory, searchParam } = getParams(
    useParams<CategoryParams>(),
    useLocation().search
  );
  const [category, setCategory] = useState(selectedCategory);

  const history = useHistory();
  const { getHref, getAbsolutePath } = useLink();

  function setUrlCategory(categoryId: string) {
    setCategory(categoryId as ExtendedIntegrationCategory);

    const url = pagePathGetters.integrations_all({
      category: categoryId,
      searchTerm: searchParam,
    })[1];
    history.push(url);
  }

  function setUrlSearchTerm(search: string) {
    // Use .replace so the browser's back button is not tied to single keystroke
    history.replace(pagePathGetters.integrations_all({ searchTerm: search, category })[1]);
  }

  const {
    data: eprPackages,
    isLoading: isLoadingAllPackages,
    error: eprPackageLoadingError,
  } = useGetPackages({
    category: '',
    excludeInstallStatus: true,
  });

  // Remove Kubernetes package granularity
  if (eprPackages?.items) {
    eprPackages.items.forEach(function (element) {
      if (element.id === 'kubernetes') {
        element.policy_templates = [];
      }
    });
  }

  const eprIntegrationList = useMemo(
    () => packageListToIntegrationsList(eprPackages?.items || []),
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
    return mapToCard({ getAbsolutePath, getHref, item, addBasePath });
  });

  cards.sort((a, b) => {
    return a.title.localeCompare(b.title);
  });

  const {
    data: eprCategories,
    isLoading: isLoadingCategories,
    error: eprCategoryLoadingError,
  } = useGetCategories({
    include_policy_templates: true,
  });

  const categories: CategoryFacet[] = useMemo(() => {
    const eprAndCustomCategories: CategoryFacet[] = isLoadingCategories
      ? []
      : mergeCategoriesAndCount(
          eprCategories
            ? (eprCategories.items as Array<{ id: string; title: string; count: number }>)
            : [],
          cards
        );
    return [
      {
        ...ALL_CATEGORY,
        count: cards.length,
      },
      ...(eprAndCustomCategories ? eprAndCustomCategories : []),
    ];
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
          selectedCategory={category}
          onCategoryChange={({ id }) => {
            setUrlCategory(id);
          }}
        />
      </EuiFlexItem>,
      ...controls,
    ];
  }

  const filteredCards = cards.filter((c) => {
    if (category === '') {
      return true;
    }

    return c.categories.includes(category);
  });

  // TODO: Remove this hard coded list of integrations with a suggestion service
  const featuredList = (
    <>
      <EuiFlexGrid columns={3}>
        <EuiFlexItem>
          <TrackApplicationView viewId="integration-card:epr:web_crawler:featured">
            <EuiCard
              data-test-subj="integration-card:epr:web_crawler:featured"
              icon={<EuiIcon type="logoEnterpriseSearch" size="xxl" />}
              href={addBasePath(
                '/app/enterprise_search/content/search_indices/new_index?method=crawler'
              )}
              title={i18n.translate('xpack.fleet.featuredSearchTitle', {
                defaultMessage: 'Web crawler',
              })}
              description={i18n.translate('xpack.fleet.featuredSearchDesc', {
                defaultMessage:
                  'Add search to your website with the Enterprise Search web crawler.',
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
                  'Monitor, detect, and diagnose complex application performance issues.',
              })}
              href={addBasePath('/app/home#/tutorial/apm')}
              icon={<EuiIcon type="logoObservability" size="xxl" />}
            />
          </TrackApplicationView>
        </EuiFlexItem>
        <EuiFlexItem>
          <TrackApplicationView viewId="integration-card:epr:endpoint:featured">
            <EuiCard
              data-test-subj="integration-card:epr:endpoint:featured"
              icon={<EuiIcon type="logoSecurity" size="xxl" />}
              href={addBasePath('/app/integrations/detail/endpoint/')}
              title={i18n.translate('xpack.fleet.featuredSecurityTitle', {
                defaultMessage: 'Elastic Defend',
              })}
              description={i18n.translate('xpack.fleet.featuredSecurityDesc', {
                defaultMessage:
                  'Protect your hosts and cloud workloads with threat prevention, detection, and deep security data visibility.',
              })}
            />
          </TrackApplicationView>
        </EuiFlexItem>
      </EuiFlexGrid>
      <EuiSpacer size="xl" />
    </>
  );

  let noEprCallout;
  if (eprPackageLoadingError || eprCategoryLoadingError) {
    const error = eprPackageLoadingError || eprCategoryLoadingError;
    noEprCallout = <NoEprCallout statusCode={error?.statusCode} />;
  }

  return (
    <PackageListGrid
      featuredList={featuredList}
      isLoading={isLoadingAllPackages}
      controls={controls}
      initialSearch={searchParam}
      list={filteredCards}
      selectedCategory={category}
      setSelectedCategory={setUrlCategory}
      categories={categories}
      onSearchChange={setUrlSearchTerm}
      showMissingIntegrationMessage
      callout={noEprCallout}
      showCardLabels={false}
    />
  );
};
