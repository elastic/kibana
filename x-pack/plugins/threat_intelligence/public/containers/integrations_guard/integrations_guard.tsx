/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingLogo } from '@elastic/eui';
import React, { FC } from 'react';
import { EmptyPage } from '../../modules/empty_page';
import { useIndicatorsTotalCount } from '../../modules/indicators';
import { SecuritySolutionPluginTemplateWrapper } from '../security_solution_plugin_template_wrapper';

/**
 * Renders children only if TI integrations are enabled
 */
export const IntegrationsGuard: FC = ({ children }) => {
  const { count: indicatorsTotalCount, isLoading: isIndicatorsTotalCountLoading } =
    useIndicatorsTotalCount();

  if (isIndicatorsTotalCountLoading) {
    return (
      <SecuritySolutionPluginTemplateWrapper isEmptyState>
        <EuiLoadingLogo logo="logoSecurity" size="xl" />
      </SecuritySolutionPluginTemplateWrapper>
    );
  }

  const showEmptyPage = indicatorsTotalCount === 0;

  return showEmptyPage ? <EmptyPage /> : <>{children}</>;
};
