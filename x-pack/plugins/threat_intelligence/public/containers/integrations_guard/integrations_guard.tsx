/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingLogo } from '@elastic/eui';
import React, { FC } from 'react';
import { useQuery } from '@tanstack/react-query';
import { EmptyPage } from '../../modules/empty_page';
import { useIndicatorsTotalCount } from '../../modules/indicators';
import { SecuritySolutionPluginTemplateWrapper } from '../security_solution_plugin_template_wrapper';
import { useKibana } from '../../hooks';

type IntegrationInstallStatus = 'installed' | 'installing' | 'install_failed';

const INTEGRATIONS_URL = '/api/fleet/epm/packages';

const INTEGRATIONS_STALE_TIME = 2000;

export const THREAT_INTELLIGENCE_CATEGORY = 'threat_intel';

export const THREAT_INTELLIGENCE_UTILITIES = 'ti_util';

export const INSTALLATION_STATUS = {
  Installed: 'installed',
  Installing: 'installing',
  InstallFailed: 'install_failed',
  NotInstalled: 'not_installed',
};

interface IntegrationResponse {
  items: Integration[];
}

interface Integration {
  categories: string[];
  id: string;
  status: IntegrationInstallStatus;
}

/**
 * Renders children only if TI integrations are enabled and indicators are received
 */
export const IntegrationsGuard: FC = ({ children }) => {
  const { http } = useKibana().services;

  const { isLoading: indicatorsTotalCountLoading, count: indicatorsTotalCount } =
    useIndicatorsTotalCount();

  // we only select integrations: (see https://github.com/elastic/security-team/issues/4374)
  // - of status `installed`
  // - with `threat_intel` category
  // - excluding `ti_util` integration
  const { isLoading: integrationLoading, data: installedTIIntegrations } = useQuery(
    ['integrations'],
    () => http.get<IntegrationResponse>(INTEGRATIONS_URL),
    {
      select: (data: IntegrationResponse) =>
        data?.items.filter(
          (pkg: any) =>
            pkg.status === INSTALLATION_STATUS.Installed &&
            pkg.categories.find((category: string) => category === THREAT_INTELLIGENCE_CATEGORY) !=
              null &&
            pkg.id !== THREAT_INTELLIGENCE_UTILITIES
        ) || [],
      staleTime: INTEGRATIONS_STALE_TIME,
    }
  );

  if (integrationLoading || indicatorsTotalCountLoading) {
    return (
      <SecuritySolutionPluginTemplateWrapper isEmptyState>
        <EuiLoadingLogo logo="logoSecurity" size="xl" />
      </SecuritySolutionPluginTemplateWrapper>
    );
  }

  // show indicators page if there are indicators, or if some ti integrations have been added
  // @ts-ignore
  const showIndicatorsPage = indicatorsTotalCount > 0 || installedTIIntegrations.length > 0;
  return showIndicatorsPage ? <>{children}</> : <EmptyPage />;
};
