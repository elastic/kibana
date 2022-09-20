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
import { EnteredInput } from './lib/entered_input';
import type { InputCaptureProps } from './components/input_capture';
import { InputCapture } from './components/input_capture';
import { useWithInputVisibleState } from '../../hooks/state_selectors/use_with_input_visible_state';
import { useInputHints } from './hooks/use_input_hints';
import { InputPlaceholder } from './components/input_placeholder';
import { useWithInputTextEntered } from '../../hooks/state_selectors/use_with_input_text_entered';
import { InputAreaPopover } from './components/input_area_popover';
import { useConsoleStateDispatch } from '../../hooks/state_selectors/use_console_state_dispatch';
import { useTestIdGenerator } from '../../../../hooks/use_test_id_generator';
import { useDataTestSubj } from '../../hooks/state_selectors/use_data_test_subj';

const CommandInputContainer = styled.div`
  background-color: ${({ theme: { eui } }) => eui.euiFormBackgroundColor};
  border-radius: ${({ theme: { eui } }) => eui.euiBorderRadius};
  padding: ${({ theme: { eui } }) => eui.euiSizeS};
  outline: ${({ theme: { eui } }) => eui.euiBorderThin};

  &:focus-within {
    border-bottom: ${({ theme: { eui } }) => eui.euiBorderThick};
    border-bottom-color: ${({ theme: { eui } }) => eui.euiColorPrimary};
  }

  &.error {
    border-bottom-color: ${({ theme: { eui } }) => eui.euiColorDanger};
  }

  .textEntered {
    white-space: break-spaces;
  }

  .prompt {
    padding-right: 1ch;
  }

  .cursor {
    display: inline-block;
    width: 1px;
    height: ${({ theme: { eui } }) => eui.euiLineHeight}em;
    background-color: ${({ theme }) => theme.eui.euiTextSubduedColor};
  }

  &.hasFocus {
    .cursor {
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
    }
  }
`;

export interface CommandInputProps extends CommonProps {
  prompt?: string;
  isWaiting?: boolean;
  focusRef?: InputCaptureProps['focusRef'];
}

export const CommandInput = memo<CommandInputProps>(({ prompt = '', focusRef, ...commonProps }) => {
  useInputHints();
  const dispatch = useConsoleStateDispatch();
  const { rightOfCursor, textEntered, fullTextEntered } = useWithInputTextEntered();
  const visibleState = useWithInputVisibleState();
  const [isKeyInputBeingCaptured, setIsKeyInputBeingCaptured] = useState(false);
  const getTestId = useTestIdGenerator(useDataTestSubj());
  const [commandToExecute, setCommandToExecute] = useState('');

  const containerRef = useRef<HTMLDivElement | null>(null);
  const dimensions = useResizeObserver(containerRef.current);
  const _focusRef: InputCaptureProps['focusRef'] = useRef(null);

  const keyCaptureFocusRef = focusRef || _focusRef;

  const popoverWidth = useMemo(() => {
    return dimensions.width ? `${dimensions.width}px` : '92vw';
  }, [dimensions.width]);

  const inputContainerClassname = useMemo(() => {
    return classNames({
      cmdInput: true,
      hasFocus: isKeyInputBeingCaptured,
      error: visibleState === 'error',
    });
  }, [isKeyInputBeingCaptured, visibleState]);

  const disableArrowButton = useMemo(() => fullTextEntered.trim().length === 0, [fullTextEntered]);

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

  const handleOnChangeFocus = useCallback<NonNullable<InputCaptureProps['onChangeFocus']>>(
    (hasFocus) => {
      setIsKeyInputBeingCaptured(hasFocus);
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

  const handleInputCapture = useCallback<InputCaptureProps['onCapture']>(
    ({ value, selection, eventDetails }) => {
      const keyCode = eventDetails.keyCode;

      // UP arrow key
      // FIXME:PT to be addressed via OLM task #4384
      // if (keyCode === 38) {
      //   dispatch({ type: 'removeFocusFromKeyCapture' });
      //   dispatch({ type: 'updateInputPopoverState', payload: { show: 'input-history' } });
      //
      //   return;
      // }

      // Update the store with the updated text that was entered
      dispatch({
        type: 'updateInputTextEnteredState',
        payload: ({ textEntered: prevLeftOfCursor, rightOfCursor: prevRightOfCursor }) => {
          let inputText = new EnteredInput(prevLeftOfCursor, prevRightOfCursor.text);

          inputText.addValue(value ?? '', selection);

          switch (keyCode) {
            // BACKSPACE
            case 8:
              inputText.backspaceChar(selection);
              break;

            // DELETE
            case 46:
              inputText.deleteChar(selection);
              break;

            // ENTER  = Execute command and blank out the input area
            case 13:
              setCommandToExecute(inputText.getFullText());
              inputText = new EnteredInput('', '');
              break;

            // ARROW LEFT
            case 37:
              inputText.moveCursorTo('left');
              break;

            // ARROW RIGHT
            case 39:
              inputText.moveCursorTo('right');
              break;

            // HOME
            case 36:
              inputText.moveCursorTo('home');
              break;

            // END
            case 35:
              inputText.moveCursorTo('end');
              break;
          }

          return {
            textEntered: inputText.getLeftOfCursorText(),
            rightOfCursor: { text: inputText.getRightOfCursorText() },
          };
        },
      });
    },
    [dispatch]
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
        className={inputContainerClassname}
        onClick={handleTypingAreaClick}
        ref={containerRef}
        data-test-subj={getTestId('cmdInput-container')}
      >
        <EuiFlexGroup
          wrap={true}
          responsive={false}
          alignItems="center"
          gutterSize="none"
          justifyContent="flexStart"
        >
          {prompt && (
            <EuiFlexItem grow={false} data-test-subj={getTestId('cmdInput-prompt')}>
              <span className="eui-displayInlineBlock prompt">{prompt}</span>
            </EuiFlexItem>
          )}
          <EuiFlexItem className="textEntered">
            <InputCapture
              onCapture={handleInputCapture}
              onChangeFocus={handleOnChangeFocus}
              focusRef={focusRef}
            >
              <EuiFlexGroup
                responsive={false}
                alignItems="center"
                gutterSize="none"
                justifyContent="flexStart"
              >
                <EuiFlexItem grow={false}>
                  <div data-test-subj={getTestId('cmdInput-leftOfCursor')}>{textEntered}</div>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <span className="cursor essentialAnimation" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <div data-test-subj={getTestId('cmdInput-rightOfCursor')}>
                    {rightOfCursor.text}
                  </div>
                </EuiFlexItem>
              </EuiFlexGroup>
            </InputCapture>
            <InputPlaceholder />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              data-test-subj={getTestId('inputTextSubmitButton')}
              aria-label="submit-command"
              iconType="playFilled"
              display="empty"
              color="primary"
              isDisabled={disableArrowButton}
              onClick={handleSubmitButton}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </CommandInputContainer>
    </InputAreaPopover>
  );
});
CommandInput.displayName = 'CommandInput';
