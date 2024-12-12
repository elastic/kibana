/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiPageHeaderProps } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ObservabilityPageTemplateProps } from '@kbn/observability-shared-plugin/public';
import type { KibanaPageTemplateProps } from '@kbn/shared-ux-page-kibana-template';
import React, { useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { FeatureFeedbackButton } from '@kbn/observability-shared-plugin/public';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { isLogsSignal } from '../../../../utils/get_signal_type';
import { useLocalStorage } from '../../../../hooks/use_local_storage';
import { useDefaultAiAssistantStarterPromptsForAPM } from '../../../../hooks/use_default_ai_assistant_starter_prompts_for_apm';
import { KibanaEnvironmentContext } from '../../../../context/kibana_environment_context/kibana_environment_context';
import { getPathForFeedback } from '../../../../utils/get_path_for_feedback';
import { EnvironmentsContextProvider } from '../../../../context/environments_context/environments_context';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { ApmPluginStartDeps } from '../../../../plugin';
import { ServiceGroupSaveButton } from '../../../app/service_groups';
import { ServiceGroupsButtonGroup } from '../../../app/service_groups/service_groups_button_group';
import { ApmEnvironmentFilter } from '../../../shared/environment_filter';
import { getNoDataConfig } from '../no_data_config';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { EntitiesInventoryCallout } from './entities_inventory_callout';
import { useEntityCentricExperienceSetting } from '../../../../hooks/use_entity_centric_experience_setting';

// Paths that must skip the no data screen
const bypassNoDataScreenPaths = ['/settings', '/diagnostics'];
const APM_FEEDBACK_LINK = 'https://ela.st/services-feedback';
const APM_NEW_EXPERIENCE_FEEDBACK_LINK = 'https://ela.st/entity-services-feedback';

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
  showEnablementCallout = false,
  selectedNavButton,
  ...pageTemplateProps
}: {
  pageTitle?: React.ReactNode;
  pageHeader?: EuiPageHeaderProps;
  children: React.ReactNode;
  environmentFilter?: boolean;
  showServiceGroupSaveButton?: boolean;
  showServiceGroupsNav?: boolean;
  showEnablementCallout?: boolean;
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
  const { serviceEntitySummary } = useApmServiceContext();
  const { isEntityCentricExperienceEnabled } = useEntityCentricExperienceSetting();

  const ObservabilityPageTemplate = observabilityShared.navigation.PageTemplate;

  const { data, status } = useFetcher((callApmApi) => {
    return callApmApi('GET /internal/apm/has_data');
  }, []);

  // create static data view on initial load
  useFetcher(
    (callApmApi) => {
      const canCreateDataView = application?.capabilities.savedObjectsManagement.edit;

      if (canCreateDataView) {
        return callApmApi('POST /internal/apm/data_view/static');
      }
    },
    [application?.capabilities.savedObjectsManagement.edit]
  );

  const hasLogsData = serviceEntitySummary?.dataStreamTypes
    ? serviceEntitySummary?.dataStreamTypes?.length > 0 &&
      isLogsSignal(serviceEntitySummary.dataStreamTypes)
    : false;

  const shouldBypassNoDataScreen =
    bypassNoDataScreenPaths.some((path) => location.pathname.includes(path)) ||
    (isEntityCentricExperienceEnabled && hasLogsData);

  const { data: fleetApmPoliciesData, status: fleetApmPoliciesStatus } = useFetcher(
    (callApmApi) => {
      if (!data?.hasData && !shouldBypassNoDataScreen) {
        return callApmApi('GET /internal/apm/fleet/has_apm_policies');
      }
    },
    [shouldBypassNoDataScreen, data?.hasData]
  );

  const isLoading =
    status === FETCH_STATUS.LOADING || fleetApmPoliciesStatus === FETCH_STATUS.LOADING;

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

  useDefaultAiAssistantStarterPromptsForAPM({
    hasApmData,
    hasApmIntegrations,
    noDataConfig,
  });

  const sanitizedPath = getPathForFeedback(window.location.pathname);

  const rightSideItems = [
    ...(showServiceGroupSaveButton ? [<ServiceGroupSaveButton />] : []),
    ...(environmentFilter ? [<ApmEnvironmentFilter />] : []),
    <FeatureFeedbackButton
      data-test-subj="infraApmFeedbackLink"
      formUrl={
        isEntityCentricExperienceEnabled && sanitizedPath.includes('service')
          ? APM_NEW_EXPERIENCE_FEEDBACK_LINK
          : APM_FEEDBACK_LINK
      }
      kibanaVersion={kibanaVersion}
      isCloudEnv={isCloudEnv}
      isServerlessEnv={isServerlessEnv}
      sanitizedPath={sanitizedPath}
    />,
  ];

  const [dismissedEntitiesInventoryCallout, setdismissedEntitiesInventoryCallout] = useLocalStorage(
    `apm.dismissedEntitiesInventoryCallout`,
    false
  );

  const showEntitiesInventoryCallout =
    !dismissedEntitiesInventoryCallout &&
    isEntityCentricExperienceEnabled &&
    selectedNavButton !== undefined;

  return (
    <EnvironmentsContextProvider>
      <ObservabilityPageTemplate
        noDataConfig={shouldBypassNoDataScreen ? undefined : noDataConfig}
        isPageDataLoaded={isLoading === false}
        pageHeader={{
          rightSideItems,
          ...pageHeader,
          pageTitle: pageHeader?.pageTitle ?? pageTitle,
          children: (
            <EuiFlexGroup direction="column">
              {showEntitiesInventoryCallout ? (
                <EntitiesInventoryCallout
                  onDismiss={() => {
                    setdismissedEntitiesInventoryCallout(true);
                  }}
                />
              ) : null}
              {showServiceGroupsNav && selectedNavButton && (
                <ServiceGroupsButtonGroup selectedNavButton={selectedNavButton} />
              )}
            </EuiFlexGroup>
          ),
        }}
        {...pageTemplateProps}
      >
        {children}
      </ObservabilityPageTemplate>
    </EnvironmentsContextProvider>
  );
}
