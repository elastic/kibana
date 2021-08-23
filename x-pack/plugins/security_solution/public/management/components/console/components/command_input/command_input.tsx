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
  prompt?: string;
}

export const CommandInput = memo<CommandInputProps>(({ prompt = '>', ...commonProps }) => {
  // TODO:PT make entire area "focus'able and when user is not "within" then make cursor stop blinking and only have a white border

  const [textEntered, setTextEntered] = useState<string>('');
  const focusRef: KeyCaptureProps['focusRef'] = useRef(null);
  const textDisplayRef = useRef<HTMLDivElement | null>(null);

  const handleTypingAreaClick = useCallback<MouseEventHandler>((ev) => {
    // FIXME:PT Only focus if user did not click/select text on the input area

    if (focusRef.current) {
      focusRef.current();
    }
  }, []);

  const handleKeyCapture = useCallback<KeyCaptureProps['onCapture']>(({ value, eventDetails }) => {
    setTextEntered((prevState) => {
      let updatedState = prevState + value;

      switch (eventDetails.keyCode) {
        // DELETE
        case 8:
          if (updatedState.length) {
            updatedState = updatedState.replace(/.$/, '');
          }
          break;

        // ENTER
        case 13:
          console.log(`user pressed ENTER. Run command`);
          break;
      }

      return updatedState;
    });
  }, []);

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
});
CommandInput.displayName = 'CommandInput';
