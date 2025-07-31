/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiCard,
  EuiIcon,
  EuiEmptyPrompt,
} from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { useNavigation } from '../../hooks/use_navigation';
import { useKibana } from '../../hooks/use_kibana';
import { appPaths } from '../../app_paths';

export const WorkChatHomeView: React.FC<{}> = () => {
  const { navigateToWorkchatUrl } = useNavigation();
  const { services } = useKibana();

  const navigateToChat = () => {
    // Navigate to onechat conversations page
    services.application.navigateToApp('onechat', { path: '/conversations' });
  };

  return (
    <KibanaPageTemplate data-test-subj="workChatHomePage">
      <KibanaPageTemplate.Section flex-direction="column" restrictWidth={1200} paddingSize="xl">
        <EuiEmptyPrompt
          icon={<EuiIcon type="discuss" size="xxl" />}
          title={<h1>Welcome to WorkChat</h1>}
          body={
            <EuiText color="subdued">
              <p>
                WorkChat is your intelligent conversational AI platform for enterprise workflows.
                Connect your data sources, configure AI agents, and streamline your team's
                productivity.
              </p>
            </EuiText>
          }
          actions={[
            <EuiButton fill>Get Started</EuiButton>,
            <EuiButton>View Documentation</EuiButton>,
          ]}
        />

        <EuiSpacer size="xxl" />

        <EuiTitle size="m">
          <h2>Quick Actions</h2>
        </EuiTitle>

        <EuiSpacer size="l" />

        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiCard
              icon={<EuiIcon size="l" type="database" />}
              title="Data Sources"
              description="Browse and manage your connected data sources"
              onClick={() => {
                navigateToWorkchatUrl(appPaths.data.sources);
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiCard
              icon={<EuiIcon size="l" type="link" />}
              title="Connections"
              description="Configure and monitor data connections"
              onClick={() => {
                navigateToWorkchatUrl(appPaths.data.connections);
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiCard
              icon={<EuiIcon size="l" type="discuss" />}
              title="Chat"
              description="Start a conversation with your AI assistant"
              onClick={navigateToChat}
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="xxl" />

        <EuiPanel paddingSize="l" color="subdued">
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem>
              <EuiTitle size="s">
                <h3>Getting Started</h3>
              </EuiTitle>
              <EuiText size="s">
                <p>
                  Connect your first data source and start building intelligent workflows with
                  WorkChat's AI-powered conversational interface.
                </p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton size="s">View Guide</EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
