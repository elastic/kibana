/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { css } from '@emotion/react';
import { useSecurityAssistantContext } from '../security_assistant_context';

interface UserSecurityAssistantOverlayProps {
  promptContextId?: string;
  conversationId?: string;
}
interface UserSecurityAssistantOverlay {
  showSecurityAssistantOverlay: (showOverlay: boolean) => void;
  MagicButton: JSX.Element;
}

export const useSecurityAssistantOverlay = ({
  promptContextId,
  conversationId,
}: UserSecurityAssistantOverlayProps): UserSecurityAssistantOverlay => {
  const { showAssistantOverlay } = useSecurityAssistantContext();

  const showSecurityAssistantOverlay = useCallback(
    (showOverlay: boolean) => {
      showAssistantOverlay({ showOverlay, promptContextId, conversationId });
    },
    [conversationId, promptContextId, showAssistantOverlay]
  );

  // Button state
  const showOverlay = useCallback(() => {
    showSecurityAssistantOverlay(true);
  }, [showSecurityAssistantOverlay]);

  const MagicButton = useMemo(
    () => (
      <EuiButtonEmpty
        onClick={showOverlay}
        css={css`
          font-size: 24px;
        `}
      >
        {'🪄✨'}
      </EuiButtonEmpty>
    ),
    [showOverlay]
  );

  return { MagicButton, showSecurityAssistantOverlay };
};
