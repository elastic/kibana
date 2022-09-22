/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPageHeaderProps } from '@elastic/eui';
import React from 'react';
import { useLocation } from 'react-router-dom';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { KibanaPageTemplateProps } from '@kbn/shared-ux-page-kibana-template';
import { enableServiceGroups } from '@kbn/observability-plugin/public';
import { EnvironmentsContextProvider } from '../../../context/environments_context/environments_context';
import { useFetcher, FETCH_STATUS } from '../../../hooks/use_fetcher';
import { ApmPluginStartDeps } from '../../../plugin';
import { ApmEnvironmentFilter } from '../../shared/environment_filter';
import { getNoDataConfig } from './no_data_config';
import { ServiceGroupSaveButton } from '../../app/service_groups';

// Paths that must skip the no data screen
const bypassNoDataScreenPaths = ['/settings'];

/*
 * This template contains:
 *  - The Shared Observability Nav (https://github.com/elastic/kibana/blob/f7698bd8aa8787d683c728300ba4ca52b202369c/x-pack/plugins/observability/public/components/shared/page_template/README.md)
 *  - The APM Header Action Menu
 *  - Page title
 *
 *  Optionally:
 *   - EnvironmentFilter
 *   - ServiceGroupSaveButton
 */
export function ApmMainTemplate({
  pageTitle,
  pageHeader,
  children,
  environmentFilter = true,
  showServiceGroupSaveButton = false,
  ...pageTemplateProps
}: {
  pageTitle?: React.ReactNode;
  pageHeader?: EuiPageHeaderProps;
  children: React.ReactNode;
  environmentFilter?: boolean;
  showServiceGroupSaveButton?: boolean;
} & KibanaPageTemplateProps) {
  const location = useLocation();

  const { services } = useKibana<ApmPluginStartDeps>();
  const { http, docLinks, observability, application } = services;
  const basePath = http?.basePath.get();

  const ObservabilityPageTemplate = observability.navigation.PageTemplate;

  const { data, status } = useFetcher((callApmApi) => {
    return callApmApi('GET /internal/apm/has_data');
  }, []);

  // create static data view on inital load
  useFetcher(
    (callApmApi) => {
      const canCreateDataView =
        application?.capabilities.savedObjectsManagement.edit;

      if (canCreateDataView) {
        return callApmApi('POST /internal/apm/data_view/static');
      }
    },
    [application?.capabilities.savedObjectsManagement.edit]
  );

  const shouldBypassNoDataScreen = bypassNoDataScreenPaths.some((path) =>
    location.pathname.includes(path)
  );

  const { data: fleetApmPoliciesData, status: fleetApmPoliciesStatus } =
    useFetcher(
      (callApmApi) => {
        if (!data?.hasData && !shouldBypassNoDataScreen) {
          return callApmApi('GET /internal/apm/fleet/has_apm_policies');
        }
      },
      [shouldBypassNoDataScreen, data?.hasData]
    );

  const isLoading =
    status === FETCH_STATUS.LOADING ||
    fleetApmPoliciesStatus === FETCH_STATUS.LOADING;

  const noDataConfig = getNoDataConfig({
    basePath,
    docsLink: docLinks!.links.observability.guide,
    hasApmData: data?.hasData,
    hasApmIntegrations: fleetApmPoliciesData?.hasApmPolicies,
    shouldBypassNoDataScreen,
    loading: isLoading,
  });

  const {
    services: { uiSettings },
  } = useKibana<ApmPluginStartDeps>();
  const isServiceGroupsEnabled = uiSettings?.get<boolean>(enableServiceGroups);
  const renderServiceGroupSaveButton =
    showServiceGroupSaveButton && isServiceGroupsEnabled;
  const rightSideItems = [
    ...(renderServiceGroupSaveButton ? [<ServiceGroupSaveButton />] : []),
    ...(environmentFilter ? [<ApmEnvironmentFilter />] : []),
  ];

  const pageTemplate = (
    <ObservabilityPageTemplate
      noDataConfig={shouldBypassNoDataScreen ? undefined : noDataConfig}
      isPageDataLoaded={isLoading === false}
      pageHeader={{
        pageTitle,
        rightSideItems,
        ...pageHeader,
      }}
      {...pageTemplateProps}
    >
      {children}
    </ObservabilityPageTemplate>
  );

  if (environmentFilter) {
    return (
      <EnvironmentsContextProvider>{pageTemplate}</EnvironmentsContextProvider>
    );
  }

  return pageTemplate;
}
