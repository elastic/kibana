/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { MachineLearning } from './machine_learning';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';
import { SecurityRoutePageWrapper } from '../common/components/security_route_page_wrapper';

export const MachineLearningPage = React.memo(function MachineLearningPage() {
  return (
    <PluginTemplateWrapper>
      <SecurityRoutePageWrapper pageName={SecurityPageName.mlLanding} redirectOnMissing>
        <MachineLearning />
      </SecurityRoutePageWrapper>
    </PluginTemplateWrapper>
  );
});
