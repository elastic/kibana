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
import { Subject } from 'rxjs';
import { coreMock } from '@kbn/core/public/mocks';
import { ObservabilityAIAssistantAppService } from '../service/create_app_service';
import { ObservabilityAIAssistantAppServiceProvider } from '../context/observability_ai_assistant_app_service_provider';

const mockService: ObservabilityAIAssistantAppService = {
  ...createStorybookService(),
};

const mockChatService: ObservabilityAIAssistantChatService = createStorybookChatService();

const coreStart = coreMock.createStart();

export function KibanaReactStorybookDecorator(Story: ComponentType) {
  const ObservabilityAIAssistantChatServiceContext = React.createContext(mockChatService);
  const ObservabilityAIAssistantMultipaneFlyoutContext = React.createContext({
    container: <div />,
    setVisibility: () => false,
  });

  return (
    <KibanaContextProvider
      services={{
        ...coreStart,
        licensing: {
          license$: new Subject(),
        },
        // observabilityAIAssistant: {
        //   ObservabilityAIAssistantChatServiceContext,
        //   ObservabilityAIAssistantMultipaneFlyoutContext,
        // },
        plugins: {
          start: {
            observabilityAIAssistant: {
              ObservabilityAIAssistantMultipaneFlyoutContext,
            },
            triggersActionsUi: { getAddRuleFlyout: {}, getAddConnectorFlyout: {} },
          },
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
