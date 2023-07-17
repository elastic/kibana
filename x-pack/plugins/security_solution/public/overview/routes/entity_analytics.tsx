/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SecurityPageName } from '../../../common/constants';

import { PluginTemplateWrapper } from '../../common/components/plugin_template_wrapper';
import { EntityAnalyticsPage } from '../pages/entity_analytics';
import { SecurityRoutePageWrapper } from '../../common/components/security_route_page_wrapper';

const EntityAnalyticsRoutes = () => (
  <PluginTemplateWrapper>
    <SecurityRoutePageWrapper pageName={SecurityPageName.entityAnalytics}>
      <EntityAnalyticsPage />
    </SecurityRoutePageWrapper>
  </PluginTemplateWrapper>
);

EntityAnalyticsRoutes.displayName = 'EntityAnalyticsRoutes';

// eslint-disable-next-line import/no-default-export
export default EntityAnalyticsRoutes;
