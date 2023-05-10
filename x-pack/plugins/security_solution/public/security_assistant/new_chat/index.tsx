/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiPopover } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';

import { useToasts } from '../../common/lib/kibana';
import type { TimelineEventsDetailsItem } from '../../../common/search_strategy';
import { SecurityAssistant } from '../security_assistant';
import * as i18n from './translations';
import { useSecurityAssistantQuery } from '../use_security_assistant_query';

const SecurityAssistantContainer = styled.div`
  max-height: 1020px;
  max-width: 600px;
`;

const NewChatComponent: React.FC<{
  data: TimelineEventsDetailsItem[];
}> = ({ data }) => {
  const toasts = useToasts();
  const [query, setQuery] = useState<string>('');

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const closePopover = () => setIsPopoverOpen(false);

  const { getQuery } = useSecurityAssistantQuery({ data });

  const onStartConversation = useCallback(async () => {
    try {
      setQuery(await getQuery());
      setIsPopoverOpen((isOpen) => !isOpen);
    } catch (error) {
      toasts.addError(error, { title: i18n.ERROR_FETCHING_SECURITY_ASSISTANT_QUERY });
    }
  }, [getQuery, toasts]);

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
        <SecurityAssistant input={query} localStorageKey={'alertSummary'} />
      </SecurityAssistantContainer>
    </EuiPopover>
  );
};

NewChatComponent.displayName = 'NewChatComponent';

export const NewChat = React.memo(NewChatComponent);
