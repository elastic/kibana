/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';

import { SecurityPageName } from '../../common/constants';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';
import { DashboardsContainer } from './pages';

export const DashboardsRoutes = () => (
  <PluginTemplateWrapper>
    <TrackApplicationView viewId={SecurityPageName.dashboards}>
      <DashboardsContainer />
    </TrackApplicationView>
  </PluginTemplateWrapper>
);
