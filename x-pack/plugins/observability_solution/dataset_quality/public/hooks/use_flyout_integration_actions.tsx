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

export const useFlyoutIntegrationActions = () => {
  const {
    services: {
      application: { navigateToUrl },
      http: { basePath },
      share,
    },
  } = useKibanaContextForPlugin();

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
      return getRouterLinkProps({
        href,
        onClick: () => navigateToUrl(href),
      });
    },
    [basePath, navigateToUrl]
  );
  const getIndexManagementLinkProps = useCallback(
    (params: { sectionId: string; appId: string }) =>
      getRouterLinkProps({
        href: indexManagementLocator?.getRedirectUrl(params),
        onClick: () => indexManagementLocator?.navigate(params),
      }),
    [indexManagementLocator]
  );
  const getDashboardLinkProps = useCallback(
    (dashboard: Dashboard) =>
      getRouterLinkProps({
        href: dashboardLocator?.getRedirectUrl({ dashboardId: dashboard?.id } || ''),
        onClick: () => dashboardLocator?.navigate({ dashboardId: dashboard?.id } || ''),
      }),
    [dashboardLocator]
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
