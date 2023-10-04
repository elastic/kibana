/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { actionTypeRegistryMock } from '@kbn/triggers-actions-ui-plugin/public/application/action_type_registry.mock';
import React from 'react';
import type { AssistantAvailability } from '@kbn/elastic-assistant';
import { AssistantProvider } from '@kbn/elastic-assistant';

interface Props {
  children: React.ReactNode;
}

window.scrollTo = jest.fn();
window.HTMLElement.prototype.scrollIntoView = jest.fn();

/** A utility for wrapping children in the providers required to run tests */
export const MockAssistantProviderComponent: React.FC<Props> = ({ children }) => {
  const actionTypeRegistry = actionTypeRegistryMock.create();
  const mockHttp = httpServiceMock.createStartContract({ basePath: '/test' });
  mockHttp.get.mockResolvedValue([]);
  const mockAssistantAvailability: AssistantAvailability = {
    hasAssistantPrivilege: false,
    hasConnectorsAllPrivilege: true,
    hasConnectorsReadPrivilege: true,
    isAssistantEnabled: true,
  };

  return (
    <AssistantProvider
      actionTypeRegistry={actionTypeRegistry}
      assistantAvailability={mockAssistantAvailability}
      augmentMessageCodeBlocks={jest.fn(() => [])}
      baseAllow={[]}
      baseAllowReplacement={[]}
      basePath={'https://localhost:5601/kbn'}
      defaultAllow={[]}
      docLinks={{
        ELASTIC_WEBSITE_URL: 'https://www.elastic.co/',
        DOC_LINK_VERSION: 'current',
      }}
      defaultAllowReplacement={[]}
      getComments={jest.fn(() => [])}
      getInitialConversations={jest.fn(() => ({}))}
      setConversations={jest.fn()}
      setDefaultAllow={jest.fn()}
      setDefaultAllowReplacement={jest.fn()}
      http={mockHttp}
    >
      {children}
    </AssistantProvider>
  );
};

MockAssistantProviderComponent.displayName = 'MockAssistantProviderComponent';

export const MockAssistantProvider = React.memo(MockAssistantProviderComponent);
