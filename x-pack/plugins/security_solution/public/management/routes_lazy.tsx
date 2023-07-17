/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ManagementContainer } from './pages';
import { CurrentLicense } from '../common/components/current_license';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';

/**
 * Returns the React Router Routes for the management area
 */
const ManagementRoutes = () => (
  <PluginTemplateWrapper>
    <CurrentLicense>
      <ManagementContainer />
    </CurrentLicense>
  </PluginTemplateWrapper>
);

ManagementRoutes.displayName = 'ManagementRoutes';

// eslint-disable-next-line import/no-default-export
export default ManagementRoutes;
