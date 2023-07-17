/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';
import { Alerts } from './pages/alerts';

const AlertsRoute = () => (
  <PluginTemplateWrapper>
    <Alerts />
  </PluginTemplateWrapper>
);

AlertsRoute.displayName = 'AlertsRoute';

// eslint-disable-next-line import/no-default-export
export default AlertsRoute;
