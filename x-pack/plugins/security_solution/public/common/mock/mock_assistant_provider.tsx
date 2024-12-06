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
import type { ChromeNavControls, UserProfileService } from '@kbn/core/public';
import { chromeServiceMock } from '@kbn/core-chrome-browser-mocks';
import { BASE_SECURITY_CONVERSATIONS } from '../../assistant/content/conversations';

interface Props {
  assistantAvailability?: AssistantAvailability;
  isServerless?: boolean;
  navControls?: ChromeNavControls;
  children: React.ReactNode;
}

window.scrollTo = jest.fn();
window.HTMLElement.prototype.scrollIntoView = jest.fn();

/** A utility for wrapping children in the providers required to run tests */
export const MockAssistantProviderComponent: React.FC<Props> = ({
  assistantAvailability,
  isServerless = false,
  navControls = chromeServiceMock.createStartContract().navControls,
  children,
}) => {
  const actionTypeRegistry = actionTypeRegistryMock.create();
  const mockHttp = httpServiceMock.createStartContract({ basePath: '/test' });
  const mockNavigateToApp = jest.fn();
  const defaultAssistantAvailability: AssistantAvailability = {
    hasAssistantPrivilege: false,
    hasConnectorsAllPrivilege: true,
    hasConnectorsReadPrivilege: true,
    hasUpdateAIAssistantAnonymization: true,
    hasManageGlobalKnowledgeBase: true,
    isAssistantEnabled: true,
  };

  return (
    <AssistantProvider
      actionTypeRegistry={actionTypeRegistry}
      assistantAvailability={assistantAvailability ?? defaultAssistantAvailability}
      augmentMessageCodeBlocks={jest.fn(() => [])}
      basePath={'https://localhost:5601/kbn'}
      docLinks={{
        ELASTIC_WEBSITE_URL: 'https://www.elastic.co/',
        DOC_LINK_VERSION: 'current',
      }}
      getComments={jest.fn(() => [])}
      http={mockHttp}
      navigateToApp={mockNavigateToApp}
      baseConversations={BASE_SECURITY_CONVERSATIONS}
      currentAppId={'test'}
      userProfileService={jest.fn() as unknown as UserProfileService}
      navControls={navControls}
      isServerless={isServerless}
    >
      {children}
    </AssistantProvider>
  );
};

MockAssistantProviderComponent.displayName = 'MockAssistantProviderComponent';

export const MockAssistantProvider = React.memo(MockAssistantProviderComponent);
