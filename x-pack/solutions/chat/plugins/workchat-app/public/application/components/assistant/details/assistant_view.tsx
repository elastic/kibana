/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiButtonEmpty } from '@elastic/eui';
import { useNavigation } from '../../../hooks/use_navigation';
import { appPaths } from '../../../app_paths';
import { AssistantDetails } from './assistant_details';
import { AssistantWorkflow } from './assistant_workflow';
import { useAgent } from '../../../hooks/use_agent';

interface AssistantViewProps {
  agentId: string;
  selectedTab: 'details' | 'workflow';
}

export const AssistantView: React.FC<AssistantViewProps> = ({ agentId, selectedTab }) => {
  const { navigateToWorkchatUrl } = useNavigation();

  const { agent } = useAgent({ agentId });

  const tabs = [
    {
      label: i18n.translate('workchatApp.assistant.tabs.overviewTitle', {
        defaultMessage: 'Overview',
      }),
      id: 'details',
      onClick: () => navigateToWorkchatUrl(appPaths.assistants.edit({ agentId })),
    },
    {
      label: i18n.translate('workchatApp.assistant.tabs.workflowTitle', {
        defaultMessage: 'Workflows',
      }),
      id: 'workflow',
      onClick: () => navigateToWorkchatUrl(appPaths.assistants.workflow({ agentId })),
    },
  ];

  const headerButtons = [
    <EuiButton
      iconType={'newChat'}
      color="primary"
      fill
      iconSide="left"
      onClick={() => navigateToWorkchatUrl(appPaths.chat.new({ agentId }))}
    >
      New conversation
    </EuiButton>,
    <EuiButtonEmpty iconType={'question'} color="primary" iconSide="left" href="/">
      Learn more
    </EuiButtonEmpty>,
  ];

  return (
    <KibanaPageTemplate data-test-subj="workChatEditAssistantPage">
      <KibanaPageTemplate.Header
        pageTitle={agent?.name}
        rightSideItems={headerButtons}
        tabs={tabs.map((tab) => {
          return {
            ...tab,
            isSelected: tab.id === selectedTab,
          };
        })}
      />
      {selectedTab === 'details' && <AssistantDetails agentId={agentId} />}
      {selectedTab === 'workflow' && <AssistantWorkflow agentId={agentId} />}
    </KibanaPageTemplate>
  );
};
