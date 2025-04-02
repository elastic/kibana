/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { HomeAgentSection } from './home_agent_section';
import { HomeIntegrationSection } from './home_integration_section';

export const WorkChatHomeView: React.FC<{}> = () => {
  return (
    <KibanaPageTemplate panelled>
      <KibanaPageTemplate.Header pageTitle="WorkChat" />

      <HomeAgentSection />
      <HomeIntegrationSection />
    </KibanaPageTemplate>
  );
};
