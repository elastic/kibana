/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { useLocation, useHistory, useParams } from 'react-router-dom';
import semverLt from 'semver/functions/lt';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiCallOut, EuiLink } from '@elastic/eui';

import { pagePathGetters } from '../../../../constants';
import { useBreadcrumbs, useLink, useStartServices, useFleetStatus } from '../../../../hooks';
import { PackageListGrid } from '../../components/package_list_grid';

import type { PackageListItem } from '../../../../types';

import type { IntegrationsURLParameters } from './hooks/use_available_packages';

import type { CategoryFacet, ExtendedIntegrationCategory } from './category_facets';
import { CategoryFacets } from './category_facets';

import type { CategoryParams } from '.';
import { getParams, categoryExists, mapToCard } from '.';
import {
  ALL_INSTALLED_CATEGORY,
  UPDATES_AVAILABLE,
  UPDATES_AVAILABLE_CATEGORY,
} from './category_facets';

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

const InstalledIntegrationsInfoCallout: React.FC = () => (
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

const UpdatesAvailableCallout: React.FC<{ count: number }> = ({ count }) => (
  <EuiCallOut
    title={i18n.translate('xpack.fleet.epmList.updatesAvailableCalloutTitle', {
      defaultMessage:
        '{count, number} of your installed integrations {count, plural, one {has an update} other {have updates}} available.',
      values: {
        count,
      },
    })}
    iconType="alert"
    color="warning"
  >
    <p>
      <FormattedMessage
        id="xpack.fleet.epmList.updatesAvailableCalloutText"
        defaultMessage="Update your integrations to get the latest features."
      />
    </p>
  </EuiCallOut>
);

const VerificationWarningCallout: React.FC = () => {
  const { docLinks } = useStartServices();

  return (
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
          defaultMessage="One or more of the installed integrations contain an unsigned package of unknown authenticity. Learn more about {learnMoreLink}."
          values={{
            learnMoreLink: (
              <EuiLink target="_blank" external href={docLinks.links.fleet.packageSignatures}>
                <FormattedMessage
                  id="xpack.fleet.ConfirmForceInstallModal.learnMoreLink"
                  defaultMessage="package signatures"
                />
              </EuiLink>
            ),
          }}
        />
      </p>
    </EuiCallOut>
  );
};

export const InstalledPackages: React.FC<{
  installedPackages: PackageListItem[];
  isLoading: boolean;
}> = ({ installedPackages, isLoading }) => {
  useBreadcrumbs('integrations_installed');

  const { packageVerificationKeyId } = useFleetStatus();

  const { getHref, getAbsolutePath } = useLink();

  const { selectedCategory: initialSelectedCategory, searchParam } = getParams(
    useParams<CategoryParams>(),
    useLocation().search
  );
  const [selectedCategory, setCategory] = useState(initialSelectedCategory);
  const [searchTerm, setSearchTerm] = useState(searchParam || '');

  const { http } = useStartServices();
  const addBasePath = http.basePath.prepend;

  const history = useHistory();

  const buildUrl = ({ searchString, categoryId, subCategoryId }: IntegrationsURLParameters) => {
    const url = pagePathGetters.integrations_installed({
      category: categoryId ? categoryId : '',
      query: searchString ? searchString : '',
    })[1];
    return url;
  };

  const setUrlandPushHistory = ({ searchString, categoryId }: IntegrationsURLParameters) => {
    const url = buildUrl({
      categoryId,
      searchString,
    });
    history.push(url);
  };

  const setUrlandReplaceHistory = ({ searchString, categoryId }: IntegrationsURLParameters) => {
    const url = buildUrl({
      categoryId,
      searchString,
    });
    // Use .replace so the browser's back button is not tied to single keystroke
    history.replace(url);
  };

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
        ...ALL_INSTALLED_CATEGORY,
        count: installedPackages.length,
      },
      {
        ...UPDATES_AVAILABLE_CATEGORY,
        count: updatablePackages.length,
      },
    ],
    [installedPackages.length, updatablePackages.length]
  );

  if (!categoryExists(selectedCategory, categories)) {
    setUrlandReplaceHistory({ searchString: searchTerm, categoryId: '' });
    return null;
  }

  const controls = (
    <CategoryFacets
      categories={categories}
      selectedCategory={selectedCategory}
      onCategoryChange={({ id }: CategoryFacet) => {
        setCategory(id as ExtendedIntegrationCategory);
        setSearchTerm('');
        setUrlandPushHistory({ searchString: '', categoryId: id });
      }}
    />
  );

  const cards = (
    selectedCategory === UPDATES_AVAILABLE ? updatablePackages : installedPackages
  ).map((item) =>
    mapToCard({
      getAbsolutePath,
      getHref,
      addBasePath,
      item,
      selectedCategory: selectedCategory || 'installed',
      packageVerificationKeyId,
    })
  );

  let CalloutComponent = <InstalledIntegrationsInfoCallout />;

  const unverifiedCount = cards.filter((c) => c.isUnverified).length;
  const updateAvailableCount = cards.filter((c) => c.isUpdateAvailable).length;
  if (unverifiedCount) {
    CalloutComponent = <VerificationWarningCallout />;
  } else if (updateAvailableCount) {
    CalloutComponent = <UpdatesAvailableCallout count={updateAvailableCount} />;
  }
  const callout = selectedCategory === UPDATES_AVAILABLE || isLoading ? null : CalloutComponent;

  return (
    <PackageListGrid
      {...{ isLoading, controls, callout, categories }}
      selectedCategory={selectedCategory}
      setCategory={setCategory}
      setUrlandPushHistory={setUrlandPushHistory}
      setUrlandReplaceHistory={setUrlandReplaceHistory}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      list={cards}
    />
  );
};
