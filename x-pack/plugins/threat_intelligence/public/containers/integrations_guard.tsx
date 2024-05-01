/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingLogo, EuiPageTemplate } from '@elastic/eui';
import React, { memo, PropsWithChildren } from 'react';
import { LOADING_LOGO_TEST_ID } from './test_ids';
import { useIntegrations } from '../hooks/use_integrations';
import { EmptyPage } from '../modules/empty_page/empty_page';
import { useIndicatorsTotalCount } from '../modules/indicators/hooks/use_total_count';
import { SecuritySolutionPluginTemplateWrapper } from './security_solution_plugin_template_wrapper';

/**
 * Renders the indicators page if the user has some Threat Intelligence integrations installed or
 * the user is receiving indicators.
 * If none are received, show the EmptyPage with a link to go install integrations.
 * While the indicators call and the integrations call are loading, display a loading screen.
 */
export const IntegrationsGuard = memo<PropsWithChildren<unknown>>(({ children }) => {
  const { isLoading: indicatorsTotalCountLoading, count: indicatorsTotalCount } =
    useIndicatorsTotalCount();

  const { isLoading: integrationLoading, data: installedTIIntegrations } = useIntegrations({
    enabled: !indicatorsTotalCountLoading,
  });

  if (integrationLoading || indicatorsTotalCountLoading) {
    return (
      <SecuritySolutionPluginTemplateWrapper
        isEmptyState
        emptyPageBody={
          <EuiPageTemplate.EmptyPrompt color="transparent">
            <EuiLoadingLogo data-test-subj={LOADING_LOGO_TEST_ID} logo="logoSecurity" size="xl" />
          </EuiPageTemplate.EmptyPrompt>
        }
      />
    );
  }

  // show indicators page if there are indicators, or if some ti integrations have been added
  const showIndicatorsPage = indicatorsTotalCount > 0 || (installedTIIntegrations || []).length > 0;
  return showIndicatorsPage ? <>{children}</> : <EmptyPage />;
});
