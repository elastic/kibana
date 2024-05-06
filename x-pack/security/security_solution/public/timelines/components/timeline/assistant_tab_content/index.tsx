/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import styled from 'styled-components';
import { Assistant } from '@kbn/elastic-assistant';
import type { Dispatch, SetStateAction } from 'react';
import React, { memo } from 'react';
import { TIMELINE_CONVERSATION_TITLE } from '../../../../assistant/content/conversations/translations';

const AssistantTabContainer = styled.div`
  overflow-y: auto;
  width: 100%;
`;

const AssistantTab: React.FC<{
  shouldRefocusPrompt: boolean;
  setConversationTitle: Dispatch<SetStateAction<string>>;
}> = memo(({ shouldRefocusPrompt, setConversationTitle }) => (
  <AssistantTabContainer>
    <Assistant
      conversationTitle={TIMELINE_CONVERSATION_TITLE}
      embeddedLayout
      setConversationTitle={setConversationTitle}
      shouldRefocusPrompt={shouldRefocusPrompt}
    />
  </AssistantTabContainer>
));

AssistantTab.displayName = 'AssistantTab';

// eslint-disable-next-line import/no-default-export
export { AssistantTab as default };
