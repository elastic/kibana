/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRouterLinkProps } from '@kbn/router-utils';
import { useMemo, useCallback } from 'react';
import useToggle from 'react-use/lib/useToggle';
import { MANAGEMENT_APP_LOCATOR } from '@kbn/deeplinks-management/constants';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { useKibanaContextForPlugin } from '../utils';
import { Dashboard } from '../../common/api_types';
import { useDatasetDetailsTelemetry } from './use_telemetry';

export const useFlyoutIntegrationActions = () => {
  const {
    services: {
      application: { navigateToUrl },
      http: { basePath },
      share,
    },
  } = useKibanaContextForPlugin();
  const { wrapLinkPropsForTelemetry, navigationSources, navigationTargets } =
    useDatasetDetailsTelemetry();

  const [isOpen, toggleIsOpen] = useToggle(false);

  const dashboardLocator = useMemo(
    () => share.url.locators.get(DASHBOARD_APP_LOCATOR),
    [share.url.locators]
  );
  const indexManagementLocator = useMemo(
    () => share.url.locators.get(MANAGEMENT_APP_LOCATOR),
    [share.url.locators]
  );

  const handleCloseMenu = useCallback(() => {
    toggleIsOpen();
  }, [toggleIsOpen]);
  const handleToggleMenu = useCallback(() => {
    toggleIsOpen();
  }, [toggleIsOpen]);

  const getIntegrationOverviewLinkProps = useCallback(
    (name: string, version: string) => {
      const href = basePath.prepend(`/app/integrations/detail/${name}-${version}/overview`);
      return wrapLinkPropsForTelemetry(
        getRouterLinkProps({
          href,
          onClick: () => {
            return navigateToUrl(href);
          },
        }),
        navigationTargets.Integration,
        navigationSources.ActionMenu
      );
    },
    [basePath, navigateToUrl, navigationSources, navigationTargets, wrapLinkPropsForTelemetry]
  );
  const getIndexManagementLinkProps = useCallback(
    (params: { sectionId: string; appId: string }) =>
      wrapLinkPropsForTelemetry(
        getRouterLinkProps({
          href: indexManagementLocator?.getRedirectUrl(params),
          onClick: () => {
            return indexManagementLocator?.navigate(params);
          },
        }),
        navigationTargets.IndexTemplate,
        navigationSources.ActionMenu
      ),
    [
      indexManagementLocator,
      navigationSources.ActionMenu,
      navigationTargets.IndexTemplate,
      wrapLinkPropsForTelemetry,
    ]
  );
  const getDashboardLinkProps = useCallback(
    (dashboard: Dashboard) =>
      wrapLinkPropsForTelemetry(
        getRouterLinkProps({
          href: dashboardLocator?.getRedirectUrl({ dashboardId: dashboard?.id } || ''),
          onClick: () => {
            return dashboardLocator?.navigate({ dashboardId: dashboard?.id } || '');
          },
        }),
        navigationTargets.Dashboard,
        navigationSources.ActionMenu
      ),
    [dashboardLocator, navigationSources, navigationTargets, wrapLinkPropsForTelemetry]
  );

  return {
    isOpen,
    handleCloseMenu,
    handleToggleMenu,
    getIntegrationOverviewLinkProps,
    getIndexManagementLinkProps,
    getDashboardLinkProps,
  };
};
