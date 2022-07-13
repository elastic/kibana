/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useLocation, useHistory, useParams } from 'react-router-dom';
import semverLt from 'semver/functions/lt';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiCallOut, EuiLink } from '@elastic/eui';

import { pagePathGetters } from '../../../../constants';
import { useBreadcrumbs, useLink, useStartServices, useFleetStatus } from '../../../../hooks';
import { PackageListGrid } from '../../components/package_list_grid';

import type { PackageListItem } from '../../../../types';

import type { CategoryFacet } from './category_facets';
import { CategoryFacets } from './category_facets';

import type { CategoryParams } from '.';
import { getParams, categoryExists, mapToCard } from '.';
import { INSTALLED_CATEGORY } from './category_facets';

const AnnouncementLink = () => {
  const { docLinks } = useStartServices();

  return (
    <EuiLink href={docLinks.links.fleet.learnMoreBlog} target="_blank">
      {i18n.translate('xpack.fleet.epmList.availableCalloutBlogText', {
        defaultMessage: 'announcement blog post',
      })}
    </EuiLink>
  );
};

const InstalledIntegrationsInfoCallout = () => (
  <EuiCallOut
    title={i18n.translate('xpack.fleet.epmList.availableCalloutTitle', {
      defaultMessage: 'Only installed Elastic Agent Integrations are displayed.',
    })}
    iconType="iInCircle"
  >
    <p>
      <FormattedMessage
        id="xpack.fleet.epmList.availableCalloutIntroText"
        defaultMessage="To learn more about integrations and the Elastic Agent, read our {link}"
        values={{
          link: <AnnouncementLink />,
        }}
      />
    </p>
  </EuiCallOut>
);

const VerificationWarningCallout = () => (
  <EuiCallOut
    title={i18n.translate('xpack.fleet.epmList.verificationWarningCalloutTitle', {
      defaultMessage: 'Integrations not verified',
    })}
    iconType="alert"
    color="warning"
  >
    <p>
      <FormattedMessage
        id="xpack.fleet.epmList.verificationWarningCalloutIntroText"
        defaultMessage="One or more of the installed integrations contain an unsigned package of unknown authenticity."
        // TODO: add documentation link
      />
    </p>
  </EuiCallOut>
);

// TODO: clintandrewhall - this component is hard to test due to the hooks, particularly those that use `http`
// or `location` to load data.  Ideally, we'll split this into "connected" and "pure" components.
export const InstalledPackages: React.FC<{
  installedPackages: PackageListItem[];
  isLoading: boolean;
}> = ({ installedPackages, isLoading }) => {
  useBreadcrumbs('integrations_installed');

  const { packageVerificationKeyId } = useFleetStatus();

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

  const updatablePackages = useMemo(
    () =>
      installedPackages.filter(
        (item) =>
          'savedObject' in item && semverLt(item.savedObject.attributes.version, item.version)
      ),
    [installedPackages]
  );

  const categories: CategoryFacet[] = useMemo(
    () => [
      {
        ...INSTALLED_CATEGORY,
        count: installedPackages.length,
      },
      {
        id: 'updates_available',
        count: updatablePackages.length,
        title: i18n.translate('xpack.fleet.epmList.updatesAvailableFilterLinkText', {
          defaultMessage: 'Updates available',
        }),
      },
    ],
    [installedPackages.length, updatablePackages.length]
  );

  if (!categoryExists(selectedCategory, categories)) {
    history.replace(
      pagePathGetters.integrations_installed({ category: '', searchTerm: searchParam })[1]
    );

    return null;
  }

  const controls = (
    <CategoryFacets
      categories={categories}
      selectedCategory={selectedCategory}
      onCategoryChange={({ id }: CategoryFacet) => setSelectedCategory(id)}
    />
  );

  const cards = (
    selectedCategory === 'updates_available' ? updatablePackages : installedPackages
  ).map((item) =>
    mapToCard({
      getAbsolutePath,
      getHref,
      item,
      selectedCategory: selectedCategory || 'installed',
      packageVerificationKeyId,
    })
  );

  const CalloutComponent = cards.some((c) => c.isUnverified)
    ? VerificationWarningCallout
    : InstalledIntegrationsInfoCallout;
  const callout =
    selectedCategory === 'updates_available' || isLoading ? null : <CalloutComponent />;

  return (
    <PackageListGrid
      {...{ isLoading, controls, setSelectedCategory, callout }}
      onSearchChange={setSearchTerm}
      initialSearch={searchParam}
      list={cards}
    />
  );
};
