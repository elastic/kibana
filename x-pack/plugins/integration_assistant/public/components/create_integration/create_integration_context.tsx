/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type PropsWithChildren } from 'react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { AssistantProvider } from '@kbn/elastic-assistant';
import type { CreateIntegrationServices } from './types';

interface CreateIntegrationProps {
  services: CreateIntegrationServices;
}

export const CreateIntegrationContext = React.memo<PropsWithChildren<CreateIntegrationProps>>(
  ({ children, services }) => {
    const { http, docLinks, triggersActionsUi, notifications } = services;
    const basePath = http.basePath.get();

    // TODO: Implement assistant availability
    const assistantAvailability = {
      isAssistantEnabled: true,
      hasAssistantPrivilege: true,
      hasConnectorsAllPrivilege: true,
      hasConnectorsReadPrivilege: true,
      hasUpdateAIAssistantAnonymization: true,
    };

    // TODO: Implement telemetry
    const assistantTelemetry = {
      reportAssistantInvoked: () => {},
      reportAssistantMessageSent: () => {},
      reportAssistantQuickPrompt: () => {},
      reportAssistantSettingToggled: () => {},
    };

    return (
      <KibanaContextProvider services={services}>
        <AssistantProvider
          actionTypeRegistry={triggersActionsUi.actionTypeRegistry}
          //   alertsIndexPattern={alertsIndexPattern} // this is security_solution specific
          augmentMessageCodeBlocks={() => []}
          assistantAvailability={assistantAvailability}
          assistantTelemetry={assistantTelemetry}
          docLinks={{ ...docLinks }}
          basePath={basePath}
          //   basePromptContexts={Object.values(PROMPT_CONTEXTS)}
          //   baseQuickPrompts={BASE_SECURITY_QUICK_PROMPTS} // to server and plugin start
          //   baseSystemPrompts={BASE_SECURITY_SYSTEM_PROMPTS} // to server and plugin start
          baseConversations={{}}
          getComments={() => []}
          http={http}
          //   title={''}
          toasts={notifications.toasts}
        >
          {children}
        </AssistantProvider>
      </KibanaContextProvider>
    );
  }
);
CreateIntegrationContext.displayName = 'CreateIntegrationContext';
