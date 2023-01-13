/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiHorizontalRule, EuiFlexItem, EuiCallOut, EuiLink } from '@elastic/eui';

import { useStartServices } from '../../../../hooks';

import { pagePathGetters } from '../../../../constants';
import { useBreadcrumbs } from '../../../../hooks';

import { PackageListGrid } from '../../components/package_list_grid';

import { IntegrationPreference } from '../../components/integration_preference';

import { CategoryFacets } from './category_facets';

import { categoryExists } from '.';

import { useAvailablePackages } from './hooks/use_available_packages';

// TODO: move callout to its own component
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

export const AvailablePackages: React.FC<{}> = ({}) => {
  const history = useHistory();
  useBreadcrumbs('integrations_all');

  const {
    initialSelectedCategory,
    selectedCategory,
    allCategories,
    mainCategories,
    subCategories,
    preference,
    setPreference,
    isLoadingCategories,
    isLoadingAllPackages,
    isLoadingAppendCustomIntegrations,
    eprPackageLoadingError,
    eprCategoryLoadingError,
    searchParam,
    filteredCards,
    setPrereleaseIntegrationsEnabled,
    setUrlCategory,
    setUrlSearchTerm,
  } = useAvailablePackages();

  if (!isLoadingCategories && !categoryExists(initialSelectedCategory, allCategories)) {
    history.replace(pagePathGetters.integrations_all({ category: '', searchTerm: searchParam })[1]);
    return null;
  }
  // TODO: Move controls to their own component
  let controls = [
    <EuiFlexItem grow={false}>
      <EuiHorizontalRule margin="m" />
      <IntegrationPreference
        initialType={preference}
        onChange={setPreference}
        onPrereleaseEnabledChange={(isEnabled) => {
          setPrereleaseIntegrationsEnabled(isEnabled);
        }}
      />
    </EuiFlexItem>,
  ];
  // Add a feature flag?
  if (mainCategories) {
    controls = [
      <EuiFlexItem className="eui-yScrollWithShadows">
        <CategoryFacets
          isLoading={
            isLoadingCategories || isLoadingAllPackages || isLoadingAppendCustomIntegrations
          }
          categories={mainCategories}
          selectedCategory={selectedCategory}
          onCategoryChange={({ id }) => {
            setUrlCategory(id);
          }}
        />
      </EuiFlexItem>,
      ...controls,
    ];
  }

  let noEprCallout;
  if (eprPackageLoadingError || eprCategoryLoadingError) {
    const error = eprPackageLoadingError || eprCategoryLoadingError;
    noEprCallout = <NoEprCallout statusCode={error?.statusCode} />;
  }

  return (
    <PackageListGrid
      isLoading={isLoadingAllPackages || isLoadingAppendCustomIntegrations}
      controls={controls}
      initialSearch={searchParam}
      list={filteredCards}
      selectedCategory={selectedCategory}
      setSelectedCategory={setUrlCategory}
      categories={mainCategories}
      subCategories={subCategories}
      onSearchChange={setUrlSearchTerm}
      showMissingIntegrationMessage
      callout={noEprCallout}
      showCardLabels={false}
    />
  );
};
