/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import type { EuiPageHeaderProps, EuiPageSectionProps } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageSection,
  EuiSpacer,
  EuiTab,
  EuiTabs,
} from '@elastic/eui';
import type { AppHeaderProps } from '@kbn/app-header';
import { AppHeader } from '@kbn/app-header';
import { RegisterAppMenu } from '@kbn/core-chrome-browser-hooks';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ObservabilityPageTemplateProps } from '@kbn/observability-shared-plugin/public';
import type { KibanaPageTemplateProps } from '@kbn/shared-ux-page-kibana-template';
import { useLocation } from 'react-router-dom';
import type { ObservabilityOnboardingLocatorParams } from '@kbn/deeplinks-observability';
import { OBSERVABILITY_ONBOARDING_LOCATOR } from '@kbn/deeplinks-observability';
import { useDefaultAiAssistantStarterPromptsForAPM } from '../../../../hooks/use_default_ai_assistant_starter_prompts_for_apm';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import type { ApmPluginStartDeps } from '../../../../plugin';
import { useApmAppMenuConfig } from '../../app_root/apm_app_menu/apm_app_menu_context';
import { ServiceGroupSaveButton } from '../../../app/service_groups';
import { ActionsMenu } from './actions_menu';
import { mergeAppMenuConfigs } from './merge_app_menu_configs';
import { getNoDataConfig } from '../no_data_config';

// Paths that must skip the no data screen
const bypassNoDataScreenPaths = ['/settings', '/diagnostics'];

// Guarantee's responsiveness of the header content
const headerContentStyles = css`
  contain: inline-size;
`;

/**
 * Preferred AppHeader contract for ApmMainTemplate (kibana-team#3549 / #282981).
 * Search bars stay outside AppHeader via the template `searchBar` prop.
 */
export type ApmMainTemplateHeaderProps = AppHeaderProps;

export type ApmMainTemplateProps = {
  children: React.ReactNode;
  searchBar?: React.ReactNode;
  /**
   * Inline AppHeader props. When set, the legacy `pageHeader` / `pageTitle` path is not used
   * and only AppHeader renders (no double header).
   */
  header?: ApmMainTemplateHeaderProps;
  /** @deprecated Prefer `header={{ title }}` (AppHeader contract). */
  pageTitle?: React.ReactNode;
  /** @deprecated Prefer `header` (AppHeader contract). */
  pageHeader?: EuiPageHeaderProps;
  /**
   * Legacy only: injects ActionsMenu into the page header title row.
   * With `header`, pass actions via `header.menu` instead.
   */
  showActionsMenu?: boolean;
  /**
   * Legacy only: injects ServiceGroupSaveButton into the page header title row.
   * With `header`, pass actions via `header.menu` instead.
   */
  showServiceGroupSaveButton?: boolean;
} & KibanaPageTemplateProps &
  Pick<ObservabilityPageTemplateProps, 'pageSectionProps'>;

/*
 * This template contains:
 *  - The Shared Observability Nav
 *  - Page header via AppHeader (`header`) or legacy ObservabilityPageTemplate pageHeader
 *  - Optional search bar below the header
 *
 * Optionally (legacy header path only):
 *   - ServiceGroupSaveButton / ActionsMenu in the title row
 */
export function ApmMainTemplate({
  header,
  pageTitle,
  pageHeader,
  children,
  searchBar,
  showActionsMenu = false,
  showServiceGroupSaveButton = false,
  pageSectionProps,
  ...pageTemplateProps
}: ApmMainTemplateProps) {
  const location = useLocation();
  const registeredAppMenu = useApmAppMenuConfig();

  const { services } = useKibana<ApmPluginStartDeps>();
  const { docLinks, observabilityShared, application, share } = services;
  const onboardingLocator = share?.url.locators.get<ObservabilityOnboardingLocatorParams>(
    OBSERVABILITY_ONBOARDING_LOCATOR
  );
  const addDataUrl = onboardingLocator?.useUrl({ category: 'application' }) ?? '';
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
    [application?.capabilities.savedObjectsManagement.edit],
    { useLegacyCallApmApi: true }
  );

  const shouldBypassNoDataScreen = bypassNoDataScreenPaths.some((path) =>
    location.pathname.includes(path)
  );

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
    docsLink: docLinks!.links.observability.guide,
    hasApmData,
    shouldBypassNoDataScreen,
    loading: isLoading,
    addDataUrl,
  });

  useDefaultAiAssistantStarterPromptsForAPM({
    hasApmData,
    hasApmIntegrations,
    noDataConfig,
  });

  const sharedTemplateProps = {
    noDataConfig: shouldBypassNoDataScreen ? undefined : noDataConfig,
    isPageDataLoaded: isLoading === false,
    ...pageTemplateProps,
  };

  if (header) {
    // Always put the global menu on inline AppHeader (classic + solution). Do not also
    // call chrome.setAppMenu here — ClassicHeader would duplicate the same actions
    // next to breadcrumbs (kibana-team#3549). Page-local `header.menu` is merged so
    // page items compose with the registered APM menu; page `primaryActionItem` wins
    // the primary slot (e.g. Edit service group) and demotes the global primary.
    const resolvedHeader: ApmMainTemplateHeaderProps = {
      ...header,
      menu: mergeAppMenuConfigs(registeredAppMenu, header.menu),
    };

    return (
      <ObservabilityPageTemplate
        {...sharedTemplateProps}
        pageSectionProps={{
          ...pageSectionProps,
          paddingSize: 'none',
        }}
      >
        <AppHeader spacing="standard" {...resolvedHeader} />
        <EuiPageSection
          paddingSize="m"
          restrictWidth={false}
          {...omitPaddingSize(pageSectionProps)}
        >
          {searchBar && (
            <div css={headerContentStyles}>
              {searchBar}
              <EuiSpacer size="s" />
            </div>
          )}
          {children}
        </EuiPageSection>
      </ObservabilityPageTemplate>
    );
  }

  const rightSideItems = [
    ...(pageHeader?.rightSideItems ?? []),
    ...(showServiceGroupSaveButton ? [<ServiceGroupSaveButton />] : []),
    ...(showActionsMenu ? [<ActionsMenu />] : []),
  ];

  const resolvedPageTitle = pageHeader?.pageTitle ?? pageTitle;
  const titleWithActions =
    rightSideItems.length > 0 ? (
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>{resolvedPageTitle}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" responsive={false}>
            {rightSideItems.map((item, i) => (
              <EuiFlexItem key={i} grow={false}>
                {item}
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    ) : (
      resolvedPageTitle
    );

  const callerChildren = pageHeader?.children;
  const callerTabs = pageHeader?.tabs;
  const headerChildren = (
    <div css={headerContentStyles}>
      {callerChildren}
      {callerTabs && callerTabs.length > 0 && (
        <EuiTabs bottomBorder={false} size="m">
          {callerTabs.map(({ label, ...tabRest }, index) => (
            <EuiTab key={index} {...tabRest}>
              {label}
            </EuiTab>
          ))}
        </EuiTabs>
      )}
      {searchBar && (
        <>
          <EuiSpacer size="s" />
          {searchBar}
        </>
      )}
    </div>
  );

  return (
    <>
      {/* Legacy routes: chrome owns the menu (ClassicHeader / Chrome Next fallback). */}
      {registeredAppMenu ? <RegisterAppMenu config={registeredAppMenu} /> : null}
      <ObservabilityPageTemplate
        {...sharedTemplateProps}
        pageSectionProps={pageSectionProps}
        pageHeader={{
          ...pageHeader,
          color: 'subdued' as unknown as EuiPageHeaderProps['color'],
          tabs: undefined,
          rightSideItems: [],
          pageTitle: titleWithActions,
          children: headerChildren,
        }}
      >
        {children}
      </ObservabilityPageTemplate>
    </>
  );
}

function omitPaddingSize(
  props: EuiPageSectionProps | undefined
): Omit<EuiPageSectionProps, 'paddingSize'> | undefined {
  if (!props) {
    return undefined;
  }
  const { paddingSize: _paddingSize, ...rest } = props;
  return rest;
}
