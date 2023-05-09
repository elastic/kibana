/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiBadge, EuiButton, EuiFlexGroup, EuiFlexItem, EuiModal, EuiSpacer } from '@elastic/eui';

import * as i18n from './translations';
import { SecurityAssistant } from '../security_assistant';
import useEvent from 'react-use/lib/useEvent';
import styled from 'styled-components';

const isMac = navigator.platform.toLowerCase().indexOf('mac') >= 0;

const StyledEuiModal = styled(EuiModal)`
  min-width: 1200px;
  max-height: 100%;
  height: 100%;
`;

const FooterFlexGroup = styled(EuiFlexGroup)`
  margin: 12px;
`;

interface AssistantOverlayProps {}

/**
 * Modal container for Security Assistant conversations, receiving the page contents as context, plus whatever
 * component currently has focus and any specific context it may provide through the SAssInterface.
 */
export const AssistantOverlay: React.FC<AssistantOverlayProps> = React.memo(({}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [input, setInput] = useState<string | undefined>();

  // const { getQuery } = useSecurityAssistantQuery({ data });

  // const onStartConversation = useCallback(async () => {
  //   try {
  //     setQuery(await getQuery());
  //     setIsPopoverOpen((isOpen) => !isOpen);
  //   } catch (error) {
  //     toasts.addError(error, { title: i18n.ERROR_FETCHING_SECURITY_ASSISTANT_QUERY });
  //   }
  // }, [getQuery, toasts]);

  const cleanupAndCloseModal = useCallback(() => {
    setIsModalVisible(false);
    // setOverwrite(false);
    // setOverwriteExceptions(false);
  }, [setIsModalVisible]);

  // const onImportComplete = useCallback(
  //   (callCleanup: boolean) => {
  //     // setIsImporting(false);
  //     // setSelectedFiles(null);
  //     importComplete();
  //
  //     if (callCleanup) {
  //       importComplete();
  //       cleanupAndCloseModal();
  //     }
  //   },
  //   [cleanupAndCloseModal, importComplete]
  // );

  /**
   * A function that reverses and array of strings and capitalizes the first character of each string
   */

  // Register keyboard listener to show the modal when cmd + / is pressed

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === ';' && (isMac ? event.metaKey : event.ctrlKey)) {
        event.preventDefault();
        setIsModalVisible(!isModalVisible);
        // if (searchRef) {
        //   searchRef.focus();
        // } else if (buttonRef) {
        //   (buttonRef.children[0] as HTMLButtonElement).click();
        // }
      }
      // if (event.key === 'Escape' && isModalVisible) {
      //   setIsModalVisible(false);
      // }
    },
    [isModalVisible]
  );
  useEvent('keydown', onKeyDown);

  const handleCloseModal = useCallback(() => {
    cleanupAndCloseModal();
  }, [cleanupAndCloseModal]);

  // const handleActionConnectorsCheckboxClick = useCallback(() => {
  //   setOverwriteActionConnectors((shouldOverwrite) => !shouldOverwrite);
  // }, []);

  return (
    <>
      {isModalVisible && (
        <StyledEuiModal onClose={handleCloseModal}>
          <SecurityAssistant input={input} />

          <EuiSpacer size="s" />

          <FooterFlexGroup gutterSize={'l'} justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize={'s'} alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiBadge
                    color={'accent'}
                    onClick={() => setInput('Alert Summarization')}
                    onClickAriaLabel="Example of onClick event for the button"
                  >
                    {'Alert Summarization'}
                  </EuiBadge>
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <EuiBadge
                    color={'success'}
                    onClick={() => setInput('Rule Creation')}
                    onClickAriaLabel="Example of onClick event for the button"
                  >
                    {'Rule Creation'}
                  </EuiBadge>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge
                    color={'primary'}
                    onClick={() => setInput('Workflow Analysis')}
                    onClickAriaLabel="Example of onClick event for the button"
                  >
                    {'Workflow Analysis'}
                  </EuiBadge>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge
                    color={'warning'}
                    onClick={() => setInput('Threat Investigation Guides')}
                    onClickAriaLabel="Example of onClick event for the button"
                  >
                    {'Threat Investigation Guides'}
                  </EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize={'l'}>
                <EuiFlexItem>
                  <EuiButton data-test-subj="import-data-modal-button" fill>
                    {i18n.MAKE_IT_GO_BUTTON}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </FooterFlexGroup>
        </StyledEuiModal>
      )}
    </>
  );
});
AssistantOverlay.displayName = 'AssistantOverlay';
