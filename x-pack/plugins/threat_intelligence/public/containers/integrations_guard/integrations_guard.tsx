/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingLogo } from '@elastic/eui';
import React, { FC } from 'react';
import { useIntegrations } from '../../hooks';
import { EmptyPage } from '../../modules/empty_page';
import { useIndicatorsTotalCount } from '../../modules/indicators';
import { SecuritySolutionPluginTemplateWrapper } from '../security_solution_plugin_template_wrapper';

/**
 * Renders the indicators page if the user has some Threat Intelligence integrations installed or
 * the user is receiving indicators.
 * If none are received, show the EmptyPage with a link to go install integrations.
 * While the indicators call and the integrations call are loading, display a loading screen.
 */
export const IntegrationsGuard: FC = ({ children }) => {
  const { isLoading: indicatorsTotalCountLoading, count: indicatorsTotalCount } =
    useIndicatorsTotalCount();

  const { isLoading: integrationLoading, data: installedTIIntegrations } = useIntegrations();

  if (integrationLoading || indicatorsTotalCountLoading) {
    return (
      <SecuritySolutionPluginTemplateWrapper isEmptyState>
        <EuiLoadingLogo logo="logoSecurity" size="xl" />
      </SecuritySolutionPluginTemplateWrapper>
    );
  }

  // show indicators page if there are indicators, or if some ti integrations have been added
  const showIndicatorsPage = indicatorsTotalCount > 0 || (installedTIIntegrations || []).length > 0;
  return showIndicatorsPage ? <>{children}</> : <EmptyPage />;
};
