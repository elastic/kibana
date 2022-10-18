/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingLogo } from '@elastic/eui';
import React, { FC } from 'react';
import { HttpSetup } from '@kbn/core/public';
import { useRequest, UseRequestConfig } from '@kbn/es-ui-shared-plugin/public';
import { EmptyPage } from '../../modules/empty_page';
import { useIndicatorsTotalCount } from '../../modules/indicators';
import { SecuritySolutionPluginTemplateWrapper } from '../security_solution_plugin_template_wrapper';

type IntegrationInstallStatus = 'installed' | 'installing' | 'install_failed';

let httpClient: HttpSetup;

const PACKAGES_CONFIG: UseRequestConfig = {
  path: '/api/fleet/epm/packages',
  method: 'get',
};

export const THREAT_INTELLIGENCE_CATEGORY = 'threat_intel';

export const THREAT_INTELLIGENCE_UTILITIES = 'ti_util';

export const installationStatuses = {
  Installed: 'installed',
  Installing: 'installing',
  InstallFailed: 'install_failed',
  NotInstalled: 'not_installed',
};

interface Integration {
  categories: string[];
  id: string;
  status: IntegrationInstallStatus;
}

export const setHttpClient = (client: HttpSetup) => {
  httpClient = client;
};

/**
 * Renders children only if TI integrations are enabled and indicators are received
 */
export const IntegrationsGuard: FC = ({ children }) => {
  const { isLoading: indicatorsTotalCountLoading, count: indicatorsTotalCount } =
    useIndicatorsTotalCount();

  const { isLoading: packagesLoading, data: integrations } = useRequest(
    httpClient,
    PACKAGES_CONFIG
  );

  if (packagesLoading && indicatorsTotalCountLoading) {
    return (
      <SecuritySolutionPluginTemplateWrapper isEmptyState>
        <EuiLoadingLogo logo="logoSecurity" size="xl" />
      </SecuritySolutionPluginTemplateWrapper>
    );
  }

  const installedTIIntegrations: Integration[] =
    integrations?.items.filter(
      (pkg: any) =>
        pkg.status === installationStatuses.Installed &&
        pkg.categories.find((category: string) => category === THREAT_INTELLIGENCE_CATEGORY) !=
          null &&
        pkg.id !== THREAT_INTELLIGENCE_UTILITIES
    ) || [];

  // show indicators page if there are indicators, or if some ti integrations have been added
  if (indicatorsTotalCount > 0 || installedTIIntegrations.length > 0) {
    return <>{children}</>;
  }

  return <EmptyPage />;
};
