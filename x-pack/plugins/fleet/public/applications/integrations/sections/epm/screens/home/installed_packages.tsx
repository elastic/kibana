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
import {
  useBreadcrumbs,
  useLink,
  useStartServices,
  useGetPackageVerificationKeyId,
} from '../../../../hooks';
import { PackageListGrid } from '../../components/package_list_grid';
import { installationStatuses } from '../../../../../../../common/constants';
import type { PackageListItem } from '../../../../types';

import type { IntegrationsURLParameters } from './hooks/use_available_packages';

import {
  type CategoryFacet,
  type ExtendedIntegrationCategory,
  UPDATE_FAILED,
} from './category_facets';
import { CategoryFacets } from './category_facets';

import type { CategoryParams } from '.';
import { getParams, categoryExists, mapToCard } from '.';
import {
  ALL_INSTALLED_CATEGORY,
  UPDATES_AVAILABLE,
  INSTALL_FAILED,
  UPDATES_AVAILABLE_CATEGORY,
  UPDATE_FAILED_CATEGORY,
  INSTALL_FAILED_CATEGORY,
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
    iconType="warning"
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
      iconType="warning"
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

  const { packageVerificationKeyId } = useGetPackageVerificationKeyId();

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
          item?.installationInfo?.version && semverLt(item.installationInfo.version, item.version)
      ),
    [installedPackages]
  );

  // Todo move to another place
  const installationFailedPackages = useMemo(
    () =>
      installedPackages.filter(
        (item) => item?.installationInfo?.install_status === installationStatuses.InstallFailed
      ),
    [installedPackages]
  );

  const updateFailedPackages = useMemo(
    () =>
      installedPackages.filter((item) =>
        item?.installationInfo?.latest_install_failed_attempts?.some(
          (attempt) =>
            item.installationInfo && semverLt(item.installationInfo.version, attempt.target_version)
        )
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
      {
        ...UPDATE_FAILED_CATEGORY,
        count: updateFailedPackages.length,
      },
      {
        ...INSTALL_FAILED_CATEGORY,
        count: installationFailedPackages.length,
      },
    ],
    [
      installedPackages.length,
      updatablePackages.length,
      installationFailedPackages.length,
      updateFailedPackages.length,
    ]
  );

  const cards = useMemo(() => {
    let packages: PackageListItem[];
    if (selectedCategory === UPDATES_AVAILABLE) {
      packages = updatablePackages;
    } else if (selectedCategory === INSTALL_FAILED) {
      packages = installationFailedPackages;
    } else if (selectedCategory === UPDATE_FAILED) {
      packages = updateFailedPackages;
    } else {
      packages = installedPackages;
    }
    return packages.map((item) =>
      mapToCard({
        getAbsolutePath,
        getHref,
        addBasePath,
        item,
        selectedCategory: selectedCategory || 'installed',
        packageVerificationKeyId,
      })
    );
  }, [
    selectedCategory,
    updatablePackages,
    installedPackages,
    updateFailedPackages,
    installationFailedPackages,
    packageVerificationKeyId,
    addBasePath,
    getHref,
    getAbsolutePath,
  ]);

  if (!categoryExists(selectedCategory, categories)) {
    setUrlandReplaceHistory({ searchString: searchTerm, categoryId: '' });
    return null;
  }

  let CalloutComponent = <InstalledIntegrationsInfoCallout />;

  const unverifiedCount = cards.filter((c) => c.isUnverified).length;
  const updateAvailableCount = cards.filter((c) => c.isUpdateAvailable).length;
  if (unverifiedCount) {
    CalloutComponent = <VerificationWarningCallout />;
  } else if (updateAvailableCount) {
    CalloutComponent = <UpdatesAvailableCallout count={updateAvailableCount} />;
  }
  const callout = selectedCategory !== '' || isLoading ? null : CalloutComponent;

  return (
    <PackageListGrid
      {...{ isLoading, callout, categories }}
      controls={
        <CategoryFacets
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={({ id }: CategoryFacet) => {
            setCategory(id as ExtendedIntegrationCategory);
            setSearchTerm('');
            setUrlandPushHistory({ searchString: '', categoryId: id });
          }}
        />
      }
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
