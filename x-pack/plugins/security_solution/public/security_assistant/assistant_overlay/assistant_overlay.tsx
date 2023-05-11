/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiModal, EuiSpacer } from '@elastic/eui';

import useEvent from 'react-use/lib/useEvent';
import styled from 'styled-components';
import { SecurityAssistant } from '../security_assistant';
import { QuickPrompts } from './quick_prompts';

const isMac = navigator.platform.toLowerCase().indexOf('mac') >= 0;

const StyledEuiModal = styled(EuiModal)`
  min-width: 1200px;
  max-height: 100%;
  height: 100%;
`;

interface AssistantOverlayProps {}

/**
 * Modal container for Security Assistant conversations, receiving the page contents as context, plus whatever
 * component currently has focus and any specific context it may provide through the SAssInterface.
 */
export const AssistantOverlay: React.FC<AssistantOverlayProps> = React.memo(({}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [input, setInput] = useState<string | undefined>();

  // Register keyboard listener to show the modal when cmd + / is pressed
  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === ';' && (isMac ? event.metaKey : event.ctrlKey)) {
        event.preventDefault();
        setIsModalVisible(!isModalVisible);
      }
    },
    [isModalVisible]
  );
  useEvent('keydown', onKeyDown);

  // Modal control functions
  const cleanupAndCloseModal = useCallback(() => {
    setIsModalVisible(false);
  }, [setIsModalVisible]);

  const handleCloseModal = useCallback(() => {
    cleanupAndCloseModal();
  }, [cleanupAndCloseModal]);

  return (
    <>
      {isModalVisible && (
        <StyledEuiModal onClose={handleCloseModal}>
          <SecurityAssistant autoSendInput={false} />

          <EuiSpacer size="xs" />

          <QuickPrompts setInput={setInput} />
        </StyledEuiModal>
      )}
    </>
  );
});
AssistantOverlay.displayName = 'AssistantOverlay';
