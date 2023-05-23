/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import { useAssistantOverlay } from '@kbn/elastic-assistant';
import React, { useCallback, useMemo } from 'react';

import * as i18n from './translations';

const NewChatComponent: React.FC<{
  promptContextId: string;
}> = ({ promptContextId }) => {
  const { showSecurityAssistantOverlay } = useAssistantOverlay({
    promptContextId,
    conversationId: 'alertSummary',
  });

  const showOverlay = useCallback(() => {
    showSecurityAssistantOverlay(true);
  }, [showSecurityAssistantOverlay]);

  return useMemo(
    () => (
      <EuiButtonEmpty onClick={showOverlay} iconType="discuss">
        {i18n.NEW_CHAT}
      </EuiButtonEmpty>
    ),
    [showOverlay]
  );
};

NewChatComponent.displayName = 'NewChatComponent';

export const NewChat = React.memo(NewChatComponent);
