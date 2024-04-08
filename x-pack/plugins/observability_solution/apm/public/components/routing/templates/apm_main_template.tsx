/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPageHeaderProps } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ObservabilityPageTemplateProps } from '@kbn/observability-shared-plugin/public';
import type { KibanaPageTemplateProps } from '@kbn/shared-ux-page-kibana-template';
import React, { useContext, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FeatureFeedbackButton } from '@kbn/observability-shared-plugin/public';
import { i18n } from '@kbn/i18n';
import { KibanaEnvironmentContext } from '../../../context/kibana_environment_context/kibana_environment_context';
import { getPathForFeedback } from '../../../utils/get_path_for_feedback';
import { EnvironmentsContextProvider } from '../../../context/environments_context/environments_context';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { ApmPluginStartDeps } from '../../../plugin';
import { ServiceGroupSaveButton } from '../../app/service_groups';
import { ServiceGroupsButtonGroup } from '../../app/service_groups/service_groups_button_group';
import { ApmEnvironmentFilter } from '../../shared/environment_filter';
import { getNoDataConfig } from './no_data_config';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';

// Paths that must skip the no data screen
const bypassNoDataScreenPaths = ['/settings', '/diagnostics'];
const APM_FEEDBACK_LINK = 'https://ela.st/services-feedback';

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
  showServiceGroupsNav = false,
  environmentFilterInTemplate = true,
  selectedNavButton,
  ...pageTemplateProps
}: {
  pageTitle?: React.ReactNode;
  pageHeader?: EuiPageHeaderProps;
  children: React.ReactNode;
  environmentFilter?: boolean;
  showServiceGroupSaveButton?: boolean;
  showServiceGroupsNav?: boolean;
  selectedNavButton?: 'serviceGroups' | 'allServices';
} & KibanaPageTemplateProps &
  Pick<ObservabilityPageTemplateProps, 'pageSectionProps'>) {
  const location = useLocation();

  const { services } = useKibana<ApmPluginStartDeps>();
  const kibanaEnvironment = useContext(KibanaEnvironmentContext);
  const { http, docLinks, observabilityShared, application } = services;
  const { kibanaVersion, isCloudEnv, isServerlessEnv } = kibanaEnvironment;
  const basePath = http?.basePath.get();
  const { config } = useApmPluginContext();

  const aiAssistant = services.observabilityAIAssistant;

  const ObservabilityPageTemplate = observabilityShared.navigation.PageTemplate;

  const { data, status } = useFetcher((callApmApi) => {
    return callApmApi('GET /internal/apm/has_data');
  }, []);

  // create static data view on initial load
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

  const hasApmData = !!data?.hasData;
  const hasApmIntegrations = !!fleetApmPoliciesData?.hasApmPolicies;

  const noDataConfig = getNoDataConfig({
    basePath,
    docsLink: docLinks!.links.observability.guide,
    hasApmData,
    hasApmIntegrations,
    shouldBypassNoDataScreen,
    loading: isLoading,
    isServerless: config?.serverlessOnboarding,
  });

  let screenDescription = '';

  if (!hasApmData && !hasApmIntegrations) {
    screenDescription =
      'The user does not have the APM integration installed and does not have APM data.';
  } else {
    screenDescription = hasApmData
      ? 'The user has APM data.'
      : 'The user does not have APM data.';
    screenDescription = hasApmIntegrations
      ? `${screenDescription} The user has the APM integration installed.`
      : `${screenDescription} The user does not have the APM integration installed.`;
  }

  if (noDataConfig !== undefined) {
    screenDescription = `${screenDescription} The user is looking at a screen that tells them they do not have any data.`;
  }

  useEffect(() => {
    return aiAssistant?.service.setScreenContext({
      screenDescription,
      starterPrompts: [
        ...(hasApmData
          ? []
          : [
              {
                title: i18n.translate(
                  'xpack.apm.aiAssistant.starterPrompts.explainNoData.title',
                  { defaultMessage: 'Explain' }
                ),
                prompt: i18n.translate(
                  'xpack.apm.aiAssistant.starterPrompts.explainNoData.prompt',
                  { defaultMessage: "Why don't I see any data?" }
                ),
                icon: 'sparkles',
              },
            ]),
      ],
    });
  }, [
    hasApmData,
    hasApmIntegrations,
    noDataConfig,
    aiAssistant,
    screenDescription,
  ]);

  const rightSideItems = [
    ...(showServiceGroupSaveButton ? [<ServiceGroupSaveButton />] : []),
  ];

  const sanitizedPath = getPathForFeedback(window.location.pathname);
  const pageHeaderTitle = (
    <EuiFlexGroup justifyContent="spaceBetween" wrap={true}>
      {pageHeader?.pageTitle ?? pageTitle}
      <EuiFlexItem grow={false}>
        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem grow={false}>
            <FeatureFeedbackButton
              data-test-subj="infraApmFeedbackLink"
              formUrl={APM_FEEDBACK_LINK}
              kibanaVersion={kibanaVersion}
              isCloudEnv={isCloudEnv}
              isServerlessEnv={isServerlessEnv}
              sanitizedPath={sanitizedPath}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {environmentFilter && <ApmEnvironmentFilter />}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const pageTemplate = (
    <ObservabilityPageTemplate
      noDataConfig={shouldBypassNoDataScreen ? undefined : noDataConfig}
      isPageDataLoaded={isLoading === false}
      pageHeader={{
        rightSideItems,
        ...pageHeader,
        pageTitle: pageHeaderTitle,
        children:
          showServiceGroupsNav && selectedNavButton ? (
            <ServiceGroupsButtonGroup selectedNavButton={selectedNavButton} />
          ) : null,
      }}
      {...pageTemplateProps}
    >
      {children}
    </ObservabilityPageTemplate>
  );

  return (
    <EnvironmentsContextProvider>{pageTemplate}</EnvironmentsContextProvider>
  );

  return pageTemplate;
}
