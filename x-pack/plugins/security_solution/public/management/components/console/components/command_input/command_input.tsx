/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, MouseEventHandler, useCallback, useRef, useState } from 'react';
import { CommonProps, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';
import classNames from 'classnames';
import { KeyCapture, KeyCaptureProps } from './key_capture';
import { useConsoleStateDispatch } from '../../hooks/state_selectors/use_console_state_dispatch';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';
import { useDataTestSubj } from '../../hooks/state_selectors/use_data_test_subj';

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
    background-color: ${({ theme }) => theme.eui.euiTextColors.default};

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

    &.inactive {
      background-color: transparent !important;
    }
  }
`;

export interface CommandInputProps extends CommonProps {
  prompt?: string;
  isWaiting?: boolean;
  focusRef?: KeyCaptureProps['focusRef'];
}

export const CommandInput = memo<CommandInputProps>(
  ({ prompt = '>', focusRef, ...commonProps }) => {
    const dispatch = useConsoleStateDispatch();
    const [textEntered, setTextEntered] = useState<string>('');
    const [isKeyInputBeingCaptured, setIsKeyInputBeingCaptured] = useState(false);
    const _focusRef: KeyCaptureProps['focusRef'] = useRef(null);
    const textDisplayRef = useRef<HTMLDivElement | null>(null);
    const getTestId = useTestIdGenerator(useDataTestSubj());

    const keyCaptureFocusRef = focusRef || _focusRef;

    const handleKeyCaptureOnStateChange = useCallback<
      NonNullable<KeyCaptureProps['onStateChange']>
    >((isCapturing) => {
      setIsKeyInputBeingCaptured(isCapturing);
    }, []);

    const handleTypingAreaClick = useCallback<MouseEventHandler>(
      (ev) => {
        if (keyCaptureFocusRef.current) {
          keyCaptureFocusRef.current();
        }
      },
      [keyCaptureFocusRef]
    );

    const handleKeyCapture = useCallback<KeyCaptureProps['onCapture']>(
      ({ value, eventDetails }) => {
        setTextEntered((prevState) => {
          let updatedState = prevState + value;

          switch (eventDetails.keyCode) {
            // BACKSPACE
            // remove the last character from the text entered
            case 8:
              if (updatedState.length) {
                updatedState = updatedState.replace(/.$/, '');
              }
              break;

            // ENTER
            // Execute command and blank out the input area
            case 13:
              dispatch({ type: 'executeCommand', payload: { input: updatedState } });
              return '';
          }

          return updatedState;
        });
      },
      [dispatch]
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
          <EuiFlexItem grow={false} data-test-subj={getTestId('cmdInput-prompt')}>
            <span className="eui-displayInlineBlock prompt">{prompt}</span>
          </EuiFlexItem>
          <EuiFlexItem
            className="textEntered"
            grow={false}
            data-test-subj={getTestId('cmdInput-userTextInput')}
          >
            {textEntered}
          </EuiFlexItem>
          <EuiFlexItem grow>
            <span className={classNames({ cursor: true, inactive: !isKeyInputBeingCaptured })} />
          </EuiFlexItem>
        </EuiFlexGroup>
        <KeyCapture
          onCapture={handleKeyCapture}
          focusRef={keyCaptureFocusRef}
          onStateChange={handleKeyCaptureOnStateChange}
        />
      </CommandInputContainer>
    );
  }
);
CommandInput.displayName = 'CommandInput';
