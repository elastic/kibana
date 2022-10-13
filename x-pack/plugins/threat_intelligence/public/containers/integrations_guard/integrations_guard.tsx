/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingLogo } from '@elastic/eui';
import React, { FC } from 'react';
import { useRequest, UseRequestConfig } from '@kbn/es-ui-shared-plugin/public';
import { HttpSetup } from '@kbn/core/public';
import { EmptyPage } from '../../modules/empty_page';
import { SecuritySolutionPluginTemplateWrapper } from '../security_solution_plugin_template_wrapper';

let httpClient: HttpSetup;

const PACKAGES_CONFIG: UseRequestConfig = {
  path: '/api/fleet/epm/packages',
  method: 'get',
};

const THREAT_INTEL_CATEGORY = 'threat_intel';

const installationStatuses = {
  Installed: 'installed',
  Installing: 'installing',
  InstallFailed: 'install_failed',
  NotInstalled: 'not_installed',
};

const THREAT_INTELLIGENCE_UTILITIES = 'ti_util';

export const setHttpClient = (client: HttpSetup) => {
  httpClient = client;
};

/**
 * Renders children only if TI integrations are enabled
 */
export const IntegrationsGuard: FC = ({ children }) => {
  const { isLoading, data } = useRequest(httpClient, PACKAGES_CONFIG);

  if (isLoading) {
    return (
      <SecuritySolutionPluginTemplateWrapper isEmptyState>
        <EuiLoadingLogo logo="logoSecurity" size="xl" />
      </SecuritySolutionPluginTemplateWrapper>
    );
  }

  const tiIntegrations = data.items.filter(
    (pkg: any) =>
      pkg.status === installationStatuses.Installed &&
      pkg.categories.find((category: string) => category === THREAT_INTEL_CATEGORY) != null &&
      pkg.id !== THREAT_INTELLIGENCE_UTILITIES
  );

  return tiIntegrations.length > 0 ? <>{children}</> : <EmptyPage />;
};
