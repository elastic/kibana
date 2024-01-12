/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import React, { ComponentType } from 'react';
import { ObservabilityAIAssistantChatServiceProvider } from '../context/observability_ai_assistant_chat_service_provider';
import { ObservabilityAIAssistantProvider } from '../context/observability_ai_assistant_provider';
// eslint-disable-next-line @kbn/imports/no_boundary_crossing
import { mockChatService, mockService } from '../mock';

export function KibanaReactStorybookDecorator(Story: ComponentType) {
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
      }}
    >
      <ObservabilityAIAssistantProvider value={mockService}>
        <ObservabilityAIAssistantChatServiceProvider value={mockChatService}>
          <Story />
        </ObservabilityAIAssistantChatServiceProvider>
      </ObservabilityAIAssistantProvider>
    </KibanaContextProvider>
  );
}
