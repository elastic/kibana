/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, MouseEventHandler, useCallback, useRef, useState } from 'react';
import { CommonProps, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';
import { KeyCapture, KeyCaptureProps } from './key_capture';

const CommandInputContainer = styled.div`
  .prompt {
    padding-right: 1ch;
  }

  .textEntered {
    white-space: break-spaces;
  }

  .cursor {
    display: inline-block;
    width: 0.5em;
    height: 1em;
    background-color: ${({ theme }) => theme.eui.euiCodeBlockColor};

    animation: cursor-blink-animation 1s steps(5, start) infinite;
    -webkit-animation: cursor-blink-animation 1s steps(5, start) infinite;
    @keyframes cursor-blink-animation {
      to {
        visibility: hidden;
      }
    }
    @-webkit-keyframes cursor-blink-animation {
      to {
        visibility: hidden;
      }
    }
  }
`;

export interface CommandInputProps extends CommonProps {
  onExecute: (command: { input: string; name: string }) => void;
  prompt?: string;
  isWaiting?: boolean;
}

export const CommandInput = memo<CommandInputProps>(
  ({ prompt = '>', onExecute, ...commonProps }) => {
    // TODO:PT Support having a "console not focused" mode where the cursor will not blink

    const [textEntered, setTextEntered] = useState<string>('');
    const focusRef: KeyCaptureProps['focusRef'] = useRef(null);
    const textDisplayRef = useRef<HTMLDivElement | null>(null);

    const handleTypingAreaClick = useCallback<MouseEventHandler>((ev) => {
      // FIXME:PT move this to the entire console window, so that clicking it focuses the cursor

      // If user selected text, then don't focus (else they lose selection)
      if ((window.getSelection()?.toString() ?? '').length > 0) {
        return;
      }

      if (focusRef.current) {
        focusRef.current();
      }
    }, []);

    const handleKeyCapture = useCallback<KeyCaptureProps['onCapture']>(
      ({ value, eventDetails }) => {
        setTextEntered((prevState) => {
          let updatedState = prevState + value;

          switch (eventDetails.keyCode) {
            // DELETE
            // remove the last character from the text entered
            case 8:
              if (updatedState.length) {
                updatedState = updatedState.replace(/.$/, '');
              }
              break;

            // ENTER
            // Execute command and blank out the input area
            case 13:
              onExecute({ input: updatedState, name: updatedState.trim() });
              return '';
          }

          return updatedState;
        });
      },
      []
    );

    return (
      <CommandInputContainer {...commonProps} onClick={handleTypingAreaClick}>
        <EuiFlexGroup
          wrap={true}
          responsive={false}
          alignItems="flexStart"
          gutterSize="none"
          justifyContent="flexStart"
          ref={textDisplayRef}
        >
          <EuiFlexItem grow={false}>
            <span className="eui-displayInlineBlock prompt">{prompt}</span>
          </EuiFlexItem>
          <EuiFlexItem className="textEntered" grow={false}>
            {textEntered}
          </EuiFlexItem>
          <EuiFlexItem grow>
            <span className="cursor" />
          </EuiFlexItem>
        </EuiFlexGroup>
        <KeyCapture onCapture={handleKeyCapture} focusRef={focusRef} />
      </CommandInputContainer>
    );
  }
);
CommandInput.displayName = 'CommandInput';
