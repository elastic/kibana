/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MouseEventHandler } from 'react';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CommonProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, useResizeObserver, EuiButtonIcon } from '@elastic/eui';
import styled from 'styled-components';
import classNames from 'classnames';
import type { ConsoleDataState } from '../console_state/types';
import { useInputHints } from './hooks/use_input_hints';
import { InputPlaceholder } from './components/input_placeholder';
import { useWithInputTextEntered } from '../../hooks/state_selectors/use_with_input_text_entered';
import { InputAreaPopover } from './components/input_area_popover';
import type { KeyCaptureProps } from './key_capture';
import { KeyCapture } from './key_capture';
import { useConsoleStateDispatch } from '../../hooks/state_selectors/use_console_state_dispatch';
import { useTestIdGenerator } from '../../../../hooks/use_test_id_generator';
import { useDataTestSubj } from '../../hooks/state_selectors/use_data_test_subj';

const CommandInputContainer = styled.div`
  background-color: ${({ theme: { eui } }) => eui.euiFormBackgroundColor};
  border-radius: ${({ theme: { eui } }) => eui.euiBorderRadius};
  padding: ${({ theme: { eui } }) => eui.euiSizeS};
  outline: ${({ theme: { eui } }) => eui.euiBorderThin};

  .prompt {
    padding-right: 1ch;
  }

  &.active {
    border-bottom: solid ${({ theme: { eui } }) => eui.euiBorderWidthThin}
      ${({ theme: { eui } }) => eui.euiColorPrimary};
  }

  .textEntered {
    white-space: break-spaces;
  }

  .cursor {
    display: inline-block;
    width: 1px;
    height: ${({ theme: { eui } }) => eui.euiLineHeight}em;
    background-color: ${({ theme: { eui } }) => eui.euiTextColor};

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
      background-color: ${({ theme }) => theme.eui.euiTextSubduedColor} !important;
      animation: none;
      -webkit-animation: none;
    }
  }
`;

export interface CommandInputProps extends CommonProps {
  prompt?: string;
  isWaiting?: boolean;
  focusRef?: KeyCaptureProps['focusRef'];
}

export const CommandInput = memo<CommandInputProps>(({ prompt = '', focusRef, ...commonProps }) => {
  useInputHints();
  const dispatch = useConsoleStateDispatch();
  const { rightOfCursor, textEntered } = useWithInputTextEntered();
  const [isKeyInputBeingCaptured, setIsKeyInputBeingCaptured] = useState(false);
  const getTestId = useTestIdGenerator(useDataTestSubj());
  const [commandToExecute, setCommandToExecute] = useState('');

  const containerRef = useRef<HTMLDivElement | null>(null);
  const _focusRef: KeyCaptureProps['focusRef'] = useRef(null);

  // TODO:PT what do I use this for? investigate
  const textDisplayRef = useRef<HTMLDivElement | null>(null);

  const dimensions = useResizeObserver(containerRef.current);

  const keyCaptureFocusRef = focusRef || _focusRef;

  const popoverWidth = useMemo(() => {
    return dimensions.width ? `${dimensions.width}px` : '92vw';
  }, [dimensions.width]);

  const cursorClassName = useMemo(() => {
    return classNames({
      cursor: true,
      inactive: !isKeyInputBeingCaptured,
    });
  }, [isKeyInputBeingCaptured]);

  const focusClassName = useMemo(() => {
    return classNames({
      cmdInput: true,
      active: isKeyInputBeingCaptured,
    });
  }, [isKeyInputBeingCaptured]);

  const handleSubmitButton = useCallback<MouseEventHandler>(
    (ev) => {
      setCommandToExecute(textEntered + rightOfCursor.text);
      dispatch({
        type: 'updateInputTextEnteredState',
        payload: {
          textEntered: '',
          rightOfCursor: undefined,
        },
      });
    },
    [dispatch, textEntered, rightOfCursor.text]
  );

  const handleKeyCaptureOnStateChange = useCallback<NonNullable<KeyCaptureProps['onStateChange']>>(
    (isCapturing) => {
      setIsKeyInputBeingCaptured(isCapturing);
    },
    []
  );

  const handleTypingAreaClick = useCallback<MouseEventHandler>(
    (ev) => {
      if (keyCaptureFocusRef.current) {
        keyCaptureFocusRef.current.focus();
      }
    },
    [keyCaptureFocusRef]
  );

  const handleKeyCapture = useCallback<KeyCaptureProps['onCapture']>(
    ({ value, eventDetails }) => {
      const keyCode = eventDetails.keyCode;

      // UP arrow key
      if (keyCode === 38) {
        dispatch({ type: 'removeFocusFromKeyCapture' });
        dispatch({ type: 'updateInputPopoverState', payload: { show: 'input-history' } });

        return;
      }

      // Update the store with the updated text that was entered
      dispatch({
        type: 'updateInputTextEnteredState',
        payload: ({ rightOfCursor: prevRightOfCursor, textEntered: prevTextEntered }) => {
          let updatedTextEnteredState = prevTextEntered + value;
          let updatedRightOfCursor: ConsoleDataState['input']['rightOfCursor'] | undefined =
            prevRightOfCursor;

          const lengthOfTextEntered = updatedTextEnteredState.length;

          switch (keyCode) {
            // BACKSPACE
            // remove the last character from the text entered
            case 8:
              if (lengthOfTextEntered) {
                updatedTextEnteredState = updatedTextEnteredState.substring(
                  0,
                  lengthOfTextEntered - 1
                );
              }
              break;

            // ENTER
            // Execute command and blank out the input area
            case 13:
              setCommandToExecute(updatedTextEnteredState + rightOfCursor.text);
              updatedTextEnteredState = '';
              updatedRightOfCursor = undefined;
              break;

            // ARROW LEFT
            // Move cursor left (or more accurately - move text to the right of the cursor)
            case 37:
              updatedRightOfCursor = {
                ...prevRightOfCursor,
                text:
                  updatedTextEnteredState.charAt(lengthOfTextEntered - 1) + prevRightOfCursor.text,
              };
              updatedTextEnteredState = updatedTextEnteredState.substring(
                0,
                lengthOfTextEntered - 1
              );
              break;

            // ARROW RIGHT
            // Move cursor right (or more accurately - move text to the left of the cursor)
            case 39:
              updatedRightOfCursor = {
                ...prevRightOfCursor,
                text: prevRightOfCursor.text.substring(1),
              };
              updatedTextEnteredState = updatedTextEnteredState + prevRightOfCursor.text.charAt(0);
              break;

            // HOME
            // Move cursor to the start of the input area
            // (or more accurately - move all text to the right of the cursor)
            case 36:
              updatedRightOfCursor = {
                ...prevRightOfCursor,
                text: updatedTextEnteredState + prevRightOfCursor.text,
              };
              updatedTextEnteredState = '';
              break;

            // END
            // Move cursor to the end of the input area
            // (or more accurately - move all text to the left of the cursor)
            case 35:
              updatedRightOfCursor = {
                ...prevRightOfCursor,
                text: '',
              };
              updatedTextEnteredState = updatedTextEnteredState + prevRightOfCursor.text;
              break;

            // DELETE
            // Remove the first character from the Right side of cursor
            case 46:
              if (prevRightOfCursor.text) {
                updatedRightOfCursor = {
                  ...prevRightOfCursor,
                  text: prevRightOfCursor.text.substring(1),
                };
              }
              break;
          }

          return {
            textEntered: updatedTextEnteredState,
            rightOfCursor: updatedRightOfCursor,
          };
        },
      });
    },
    [dispatch, rightOfCursor.text]
  );

  // Execute the command if one was ENTER'd.
  useEffect(() => {
    if (commandToExecute) {
      dispatch({ type: 'executeCommand', payload: { input: commandToExecute } });
      setCommandToExecute('');
    }
  }, [commandToExecute, dispatch]);

  return (
    <InputAreaPopover width={popoverWidth}>
      <CommandInputContainer
        {...commonProps}
        className={focusClassName}
        onClick={handleTypingAreaClick}
        ref={containerRef}
      >
        <EuiFlexGroup
          wrap={true}
          responsive={false}
          alignItems="center"
          gutterSize="none"
          justifyContent="flexStart"
          ref={textDisplayRef}
        >
          {prompt && (
            <EuiFlexItem grow={false} data-test-subj={getTestId('cmdInput-prompt')}>
              <span className="eui-displayInlineBlock prompt">{prompt}</span>
            </EuiFlexItem>
          )}
          <EuiFlexItem className="textEntered">
            <EuiFlexGroup
              responsive={false}
              alignItems="center"
              gutterSize="none"
              justifyContent="flexStart"
            >
              <EuiFlexItem grow={false}>
                <div data-test-subj={getTestId('cmdInput-userTextInput')}>{textEntered}</div>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <span className={cursorClassName} />
              </EuiFlexItem>
              <EuiFlexItem>
                <div data-test-subj={getTestId('cmdInput-rightOfCursor')}>{rightOfCursor.text}</div>
              </EuiFlexItem>
            </EuiFlexGroup>
            <InputPlaceholder />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              data-test-subj="inputTextSubmitButton"
              aria-label="submit-command"
              iconType="playFilled"
              display="empty"
              color="primary"
              isDisabled={useMemo(
                () => textEntered.length === 0 && rightOfCursor.text.length === 0,
                [rightOfCursor.text.length, textEntered.length]
              )}
              onClick={handleSubmitButton}
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        <KeyCapture
          onCapture={handleKeyCapture}
          focusRef={keyCaptureFocusRef}
          onStateChange={handleKeyCaptureOnStateChange}
        />
      </CommandInputContainer>
    </InputAreaPopover>
  );
});
CommandInput.displayName = 'CommandInput';
