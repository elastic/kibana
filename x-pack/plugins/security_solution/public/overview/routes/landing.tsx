/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import { SecurityPageName } from '../../../common/constants';

import { PluginTemplateWrapper } from '../../common/components/plugin_template_wrapper';
import { LandingPage } from '../pages/landing';

const LandingRoutes = () => (
  <PluginTemplateWrapper>
    <TrackApplicationView viewId={SecurityPageName.landing}>
      <LandingPage />
    </TrackApplicationView>
  </PluginTemplateWrapper>
);

LandingRoutes.displayName = 'LandingRoutes';

// eslint-disable-next-line import/no-default-export
export default LandingRoutes;
