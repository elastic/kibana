/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { HomeAgentSection } from './home_agent_section';
import { EuiButtonEmpty, EuiFlexGroup } from '@elastic/eui';
import { HomeConversationHistorySection } from './home_conversation_history';

const headerButtons = [
  <EuiButtonEmpty iconType={'questionInCircle'} color="primary" iconSide="left" href="/">
    Learn more
  </EuiButtonEmpty>,
];

export const WorkChatHomeView: React.FC<{}> = () => {
  return (
    <KibanaPageTemplate data-test-subj="workChatHomePage">
      <KibanaPageTemplate.Header pageTitle="WorkChat" rightSideItems={headerButtons} />
      <KibanaPageTemplate.Section>
        <EuiFlexGroup gutterSize="l" alignItems="flexStart">
          <HomeAgentSection />
          <HomeConversationHistorySection />
        </EuiFlexGroup>
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
