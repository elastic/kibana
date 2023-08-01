/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { ComponentType } from 'react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { ObservabilityAIAssistantProvider } from '../context/observability_ai_assistant_provider';

const service = {
  isEnabled: () => true,
  chat: async (options: {
    messages: [];
    connectorId: string;
    // signal: new AbortSignal();
  }) => {},
  // callApi: ObservabilityAIAssistantAPIClient;
  getCurrentUser: async () => {},
};

export function KibanaReactStorybookDecorator(Story: ComponentType) {
  console.log('hello?');
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
      <ObservabilityAIAssistantProvider value={service}>
        <Story />
      </ObservabilityAIAssistantProvider>
    </KibanaContextProvider>
  );
}
