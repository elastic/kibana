/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { EuiFlexGroup, EuiSpacer } from '@elastic/eui';
import { HomeChatSection } from './home_chat_section';
import { HomeAssistantsSection } from './home_assistants_section';
import { HomeConversationHistorySection } from './home_conversation_history';

export const WorkChatHomeView: React.FC<{}> = () => {
  return (
    <KibanaPageTemplate data-test-subj="workChatHomePage">
      <KibanaPageTemplate.Section flex-direction="column" restrictWidth={800} paddingSize="xl">
        <EuiSpacer size="xl" />
        <HomeChatSection />
        <EuiSpacer size="xl" />
        <EuiFlexGroup gutterSize="l" alignItems="flexStart">
          <HomeAssistantsSection />
          <HomeConversationHistorySection />
        </EuiFlexGroup>
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
