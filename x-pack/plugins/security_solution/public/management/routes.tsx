/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SecurityRoutePageWrapper } from '../common/components/security_route_page_wrapper';
import { SecurityPageName } from '../app/types';
import { ManagementContainer } from './pages';
import { CurrentLicense } from '../common/components/current_license';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';
import { ManageLandingPage } from './pages/landing';

export const ManagementLanding = React.memo(() => (
  <PluginTemplateWrapper>
    <SecurityRoutePageWrapper pageName={SecurityPageName.administration} redirectOnMissing>
      <ManageLandingPage />
    </SecurityRoutePageWrapper>
  </PluginTemplateWrapper>
));
ManagementLanding.displayName = 'ManagementLanding';

/**
 * Returns the React Router Routes for the management area
 */
export const ManagementRoutes = React.memo(() => (
  <PluginTemplateWrapper>
    <CurrentLicense>
      <ManagementContainer />
    </CurrentLicense>
  </PluginTemplateWrapper>
));
ManagementRoutes.displayName = 'ManagementRoutes';
