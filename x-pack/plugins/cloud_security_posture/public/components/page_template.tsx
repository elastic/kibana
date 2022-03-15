/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { QueryStatus } from 'react-query';
import { NavLink } from 'react-router-dom';
import { EuiEmptyPrompt, EuiErrorBoundary, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  KibanaPageTemplate,
  type KibanaPageTemplateProps,
} from '../../../../../src/plugins/kibana_react/public';
import { useKubebeatDataView } from '../common/api/use_kubebeat_data_view';
import { allNavigationItems } from '../common/navigation/constants';
import type { CspNavigationItem } from '../common/navigation/types';
import { CLOUD_SECURITY_POSTURE } from '../common/translations';
import { CspLoadingState } from './csp_loading_state';
import {
  LOADING,
  NO_DATA_CONFIG_BUTTON,
  NO_DATA_CONFIG_DESCRIPTION,
  NO_DATA_CONFIG_SOLUTION_NAME,
  NO_DATA_CONFIG_TITLE,
} from './translations';
import { useCisKubernetesIntegraion } from '../common/api/use_cis_kubernetes_integration';

const activeItemStyle = { fontWeight: 700 };

export const getSideNavItems = (
  navigationItems: Record<string, CspNavigationItem>
): NonNullable<KibanaPageTemplateProps['solutionNav']>['items'] =>
  Object.entries(navigationItems)
    .filter(([_, navigationItem]) => !navigationItem.disabled)
    .map(([id, navigationItem]) => ({
      id,
      name: navigationItem.name,
      renderItem: () => (
        <NavLink to={navigationItem.path} activeStyle={activeItemStyle}>
          {navigationItem.name}
        </NavLink>
      ),
    }));

const DEFAULT_PROPS: KibanaPageTemplateProps = {
  solutionNav: {
    name: CLOUD_SECURITY_POSTURE,
    items: getSideNavItems(allNavigationItems),
  },
  restrictWidth: false,
};

const NO_DATA_CONFIG: KibanaPageTemplateProps['noDataConfig'] = {
  pageTitle: NO_DATA_CONFIG_TITLE,
  solution: NO_DATA_CONFIG_SOLUTION_NAME,
  // TODO: Add real docs link once we have it
  docsLink: 'https://www.elastic.co/guide/index.html',
  logo: 'logoSecurity',
  actions: {
    elasticAgent: {
      // TODO: Use `href` prop to link to our own integration once we have it
      title: NO_DATA_CONFIG_BUTTON,
      description: NO_DATA_CONFIG_DESCRIPTION,
    },
  },
};

const PACKAGE_NOT_INSTALLED_CONFIG: KibanaPageTemplateProps['noDataConfig'] = {
  pageTitle: NO_DATA_CONFIG_TITLE,
  solution: NO_DATA_CONFIG_SOLUTION_NAME,
  // TODO: Add real docs link once we have it
  docsLink: 'https://www.elastic.co/guide/index.html',
  logo: 'logoSecurity',
  actions: {
    elasticAgent: {
      // TODO: Use `href` prop to link to our own integration once we have it
      title: NO_DATA_CONFIG_BUTTON,
      description: NO_DATA_CONFIG_DESCRIPTION,
    },
  },
};

const DefaultLoading = () => <CspLoadingState>{LOADING}</CspLoadingState>;

const DefaultError = () => (
  <EuiEmptyPrompt
    color="danger"
    iconType="alert"
    title={
      <EuiTitle>
        <h2>
          <FormattedMessage
            id="xpack.csp.pageTemplate.loadErrorMessage"
            defaultMessage="We couldn't fetch your cloud security posture data"
          />
        </h2>
      </EuiTitle>
    }
  />
);

export const CspPageTemplate: React.FC<
  KibanaPageTemplateProps & {
    status: QueryStatus;
    loadingRender?: React.FC;
    errorRender?: React.FC;
  }
> = ({
  children,
  status,
  loadingRender = DefaultLoading,
  errorRender = DefaultError,
  ...kibanaPageTemplateProps
}) => {
  const cisKubernetes = useCisKubernetesIntegraion();

  // TODO: Consider using more sophisticated logic to find out if our integration is installed
  const kubeBeatQuery = useKubebeatDataView();

  let noDataConfig: KibanaPageTemplateProps['noDataConfig'];
  if (cisKubernetes?.status === 'not_installed') {
    noDataConfig = PACKAGE_NOT_INSTALLED_CONFIG;
  }
  // NEED TO PASS NO DATA CONFIG FROM FINDINGS AND DASHBOARD AS WELL AS STATUS
  if (cisKubernetes?.status === 'installed') {
    noDataConfig = PACKAGE_NOT_INSTALLED_CONFIG;
  }

  const getTemplate = (): KibanaPageTemplateProps['template'] => {
    if (status === 'loading' || status === 'error') return 'centeredContent';
    return 'default';
  };

  const render = () => {
    if (status === 'loading') return loadingRender;
    if (status === 'error') return errorRender;
    if (status === 'success') return children;
    return null;
  };

  return (
    <KibanaPageTemplate
      {...DEFAULT_PROPS}
      {...kibanaPageTemplateProps}
      template={getTemplate()}
      noDataConfig={noDataConfig}
    >
      <EuiErrorBoundary>{render()}</EuiErrorBoundary>
    </KibanaPageTemplate>
  );
};
