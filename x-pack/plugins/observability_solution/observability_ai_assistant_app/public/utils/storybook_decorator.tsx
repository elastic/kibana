/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import React, { ComponentType } from 'react';
import {
  createStorybookChatService,
  createStorybookService,
  type ObservabilityAIAssistantChatService,
} from '@kbn/observability-ai-assistant-plugin/public';
import { ObservabilityAIAssistantAppService } from '../service/create_app_service';
import { ObservabilityAIAssistantAppServiceProvider } from '../context/observability_ai_assistant_app_service_provider';

const mockService: ObservabilityAIAssistantAppService = {
  ...createStorybookService(),
};

const mockChatService: ObservabilityAIAssistantChatService = createStorybookChatService();

export function KibanaReactStorybookDecorator(Story: ComponentType) {
  const ObservabilityAIAssistantChatServiceContext = React.createContext(mockChatService);
  return (
    <KibanaContextProvider
      services={{
        triggersActionsUi: { getAddRuleFlyout: {} },
        uiSettings: {
          get: (setting: string) => {
            if (setting === 'dateFormat') {
              return 'MMM D, YYYY HH:mm';
            }
          },
        },
        observabilityAIAssistant: {
          ObservabilityAIAssistantChatServiceContext,
        },
      }}
    >
      <ObservabilityAIAssistantAppServiceProvider value={mockService}>
        <ObservabilityAIAssistantChatServiceContext.Provider value={mockChatService}>
          <Story />
        </ObservabilityAIAssistantChatServiceContext.Provider>
      </ObservabilityAIAssistantAppServiceProvider>
    </KibanaContextProvider>
  );
}
