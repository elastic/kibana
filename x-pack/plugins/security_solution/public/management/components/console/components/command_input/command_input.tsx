/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, MouseEventHandler, useCallback, useMemo, useRef, useState } from 'react';
import { CommonProps, EuiFlexGroup, EuiFlexItem, useResizeObserver } from '@elastic/eui';
import styled from 'styled-components';
import classNames from 'classnames';
import { useInputHints } from './hooks/use_input_hints';
import { InputPlaceholder } from './components/input_placeholder';
import { useWithInputTextEntered } from '../../hooks/state_selectors/use_with_input_text_entered';
import { InputAreaPopover } from './components/input_area_popover';
import { KeyCapture, KeyCaptureProps } from './key_capture';
import { useConsoleStateDispatch } from '../../hooks/state_selectors/use_console_state_dispatch';
import { useTestIdGenerator } from '../../../../hooks/use_test_id_generator';
import { useDataTestSubj } from '../../hooks/state_selectors/use_data_test_subj';

const CommandInputContainer = styled.div`
  background-color: ${({ theme: { eui } }) => eui.euiColorGhost};
  border-radius: ${({ theme: { eui } }) => eui.euiBorderRadius};
  padding: ${({ theme: { eui } }) => eui.paddingSizes.s};

  .prompt {
    padding-right: 1ch;
  }

  .textEntered {
    white-space: break-spaces;
  }

  .cursor {
    display: inline-block;
    width: 2px;
    height: ${({ theme: { eui } }) => eui.euiLineHeight}em;
    background-color: ${({ theme }) => theme.eui.euiColorPrimaryText};

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

export const CommandInput = memo<CommandInputProps>(({ prompt = '', focusRef, ...commonProps }) => {
  useInputHints();
  const dispatch = useConsoleStateDispatch();
  const textEntered = useWithInputTextEntered();
  const [isKeyInputBeingCaptured, setIsKeyInputBeingCaptured] = useState(false);
  const getTestId = useTestIdGenerator(useDataTestSubj());

  const containerRef = useRef<HTMLDivElement | null>(null);
  const _focusRef: KeyCaptureProps['focusRef'] = useRef(null);
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
      let updatedTextEnteredState = textEntered + value;

      switch (eventDetails.keyCode) {
        // BACKSPACE
        // remove the last character from the text entered
        case 8:
          if (updatedTextEnteredState.length) {
            updatedTextEnteredState = updatedTextEnteredState.replace(/.$/, '');
          }
          break;

        // ENTER
        // Execute command and blank out the input area
        case 13:
          dispatch({ type: 'executeCommand', payload: { input: updatedTextEnteredState } });
          updatedTextEnteredState = '';
          break;

        // ARROW UP
        case 38:
          dispatch({ type: 'removeFocusFromKeyCapture' });
          dispatch({ type: 'updateInputPopoverState', payload: { show: 'input-history' } });
          break;
      }

      dispatch({
        type: 'updateInputTextEnteredState',
        payload: { textEntered: updatedTextEnteredState },
      });
    },
    [dispatch, textEntered]
  );

  return (
    <InputAreaPopover width={popoverWidth}>
      <CommandInputContainer {...commonProps} onClick={handleTypingAreaClick} ref={containerRef}>
        <EuiFlexGroup
          wrap={true}
          responsive={false}
          alignItems="flexStart"
          gutterSize="none"
          justifyContent="flexStart"
          ref={textDisplayRef}
        >
          {prompt && (
            <EuiFlexItem grow={false} data-test-subj={getTestId('cmdInput-prompt')}>
              <span className="eui-displayInlineBlock prompt">{prompt}</span>
            </EuiFlexItem>
          )}
          <EuiFlexItem
            className="textEntered"
            grow={false}
            data-test-subj={getTestId('cmdInput-userTextInput')}
          >
            <div>{textEntered}</div>
            <InputPlaceholder />
          </EuiFlexItem>
          <EuiFlexItem grow>
            <span className={cursorClassName} />
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
