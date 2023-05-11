/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiPopover } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';

import { SecurityAssistant } from '../security_assistant';
import * as i18n from './translations';

const SecurityAssistantContainer = styled.div`
  max-height: 1020px;
  max-width: 600px;
`;

const NewChatComponent: React.FC<{
  promptContextId: string;
}> = ({ promptContextId }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const closePopover = () => setIsPopoverOpen(false);

  const onStartConversation = useCallback(() => setIsPopoverOpen((isOpen) => !isOpen), []);

  const NewChatButton = useMemo(
    () => (
      <EuiButtonEmpty onClick={onStartConversation} iconType="discuss">
        {i18n.NEW_CHAT}
      </EuiButtonEmpty>
    ),
    [onStartConversation]
  );

  return (
    <EuiPopover
      button={NewChatButton}
      closePopover={closePopover}
      isOpen={isPopoverOpen}
      panelPaddingSize="none"
    >
      <SecurityAssistantContainer>
        <SecurityAssistant promptContextId={promptContextId} conversationId={'alertSummary'} />
      </SecurityAssistantContainer>
    </EuiPopover>
  );
};

NewChatComponent.displayName = 'NewChatComponent';

export const NewChat = React.memo(NewChatComponent);
