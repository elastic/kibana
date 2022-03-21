/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type {
  QueryStatus,
  UseQueryResult,
  QueryObserverLoadingResult,
  QueryObserverLoadingErrorResult,
  QueryObserverRefetchErrorResult,
} from 'react-query';
import { NavLink } from 'react-router-dom';
import { EuiEmptyPrompt, EuiErrorBoundary, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  KibanaPageTemplate,
  type KibanaPageTemplateProps,
} from '../../../../../src/plugins/kibana_react/public';
import { allNavigationItems } from '../common/navigation/constants';
import type { CspNavigationItem } from '../common/navigation/types';
import { CLOUD_SECURITY_POSTURE } from '../common/translations';
import { CspLoadingState } from './csp_loading_state';
import { LOADING, PACKAGE_NOT_INSTALLED_TEXT, DEFAULT_NO_DATA_TEXT } from './translations';
import { useCisKubernetesIntegraion } from '../common/api/use_cis_kubernetes_integration';

interface CspError {
  body: {
    error: string;
    message: string;
    statusCode: number;
  };
  name: string;
}

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

const DEFAULT_PAGE_PROPS = {
  solutionNav: {
    name: CLOUD_SECURITY_POSTURE,
    items: getSideNavItems(allNavigationItems),
  },
  restrictWidth: false,
};

export const DEFAULT_NO_DATA_CONFIG: KibanaPageTemplateProps['noDataConfig'] = {
  pageTitle: DEFAULT_NO_DATA_TEXT.PAGE_TITLE,
  solution: DEFAULT_NO_DATA_TEXT.SOLUTION,
  // TODO: Add real docs link once we have it
  docsLink: 'https://www.elastic.co/guide/index.html',
  logo: 'logoSecurity',
  actions: {},
};

const PACKAGE_NOT_INSTALLED_CONFIG: KibanaPageTemplateProps['noDataConfig'] = {
  pageTitle: PACKAGE_NOT_INSTALLED_TEXT.PAGE_TITLE,
  solution: PACKAGE_NOT_INSTALLED_TEXT.SOLUTION,
  // TODO: Add real docs link once we have it
  docsLink: 'https://www.elastic.co/guide/index.html',
  logo: 'logoSecurity',
  actions: {
    elasticAgent: {
      // TODO: Use `href` prop to link to our own integration once we have it
      title: PACKAGE_NOT_INSTALLED_TEXT.BUTTON_TITLE,
      description: PACKAGE_NOT_INSTALLED_TEXT.DESCRIPTION,
    },
  },
};

const DefaultLoading = () => <CspLoadingState>{LOADING}</CspLoadingState>;

const DefaultError = (error: CspError) => (
  <EuiEmptyPrompt
    color="danger"
    iconType="alert"
    title={
      <>
        <EuiTitle>
          <h2>
            <FormattedMessage
              id="xpack.csp.pageTemplate.loadErrorMessage"
              defaultMessage="We couldn't fetch your cloud security posture data"
            />
          </h2>
        </EuiTitle>
        <EuiTitle size="xs">
          <h5>{`${error.body.error} (${error.body.statusCode})`}</h5>
        </EuiTitle>
        <EuiTitle size="xs">
          <h5>{error.body.message}</h5>
        </EuiTitle>
      </>
    }
  />
);

export const CspPageTemplate: React.FC<
  KibanaPageTemplateProps & {
    status?: QueryStatus;
    loadingRender?: () => JSX.Element;
    errorRender?: (error: CspError) => JSX.Element;
    query?: UseQueryResult;
  }
> = ({
  query,
  children,
  status,
  loadingRender = DefaultLoading,
  errorRender = DefaultError,
  ...kibanaPageTemplateProps
}) => {
  const cisKubernetes = useCisKubernetesIntegraion();

  const getNoDataConfig = (): KibanaPageTemplateProps['noDataConfig'] => {
    // TODO: add 'installed_failed' configurations
    if (cisKubernetes?.status === 'not_installed') return PACKAGE_NOT_INSTALLED_CONFIG;
    if (query && !query.isLoading && !query.isError && !query.data)
      return kibanaPageTemplateProps.noDataConfig || DEFAULT_NO_DATA_CONFIG;
  };

  const getTemplate = (): KibanaPageTemplateProps['template'] => {
    if (query?.status === 'loading' || query?.status === 'error') return 'centeredContent';

    return 'default';
  };

  const render = () => {
    // TODO: pass query to render functions
    if (query?.status === 'loading') return loadingRender();
    if (query?.status === 'error') return errorRender(query.error as CspError);
    if (query?.status === 'success') return children;

    return children;
  };

  return (
    <KibanaPageTemplate
      {...DEFAULT_PAGE_PROPS}
      {...kibanaPageTemplateProps}
      template={getTemplate()}
      noDataConfig={getNoDataConfig()}
    >
      <EuiErrorBoundary>{render()}</EuiErrorBoundary>
    </KibanaPageTemplate>
  );
};
