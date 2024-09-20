/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MouseEventHandler } from 'react';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CommonProps } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiResizeObserver,
  EuiSpacer,
} from '@elastic/eui';
import styled from 'styled-components';
import classNames from 'classnames';
import type { EuiResizeObserverProps } from '@elastic/eui/src/components/observer/resize_observer/resize_observer';

import { useWithCommandList } from '../../hooks/state_selectors/use_with_command_list';
import { InputDisplay } from './components/input_display';
import type { ExecuteCommandPayload, ConsoleDataState } from '../console_state/types';
import { useWithInputShowPopover } from '../../hooks/state_selectors/use_with_input_show_popover';
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

  &.withPopover {
    border-top-left-radius: 0;
    border-top-right-radius: 0;
  }

  &.hasFocus {
    // Cursor is defined in '<InputDisplay>' component
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

/** Isolates a Host running either elastic endpoint or fleet agent */
// export const initSession = async (
//   params: IsolationRouteRequestBody
// ): Promise<ResponseActionApiResponse> => {
//   return KibanaServices.get().http.post<ResponseActionApiResponse>('/api/endpoint/action/init', {
//     body: JSON.stringify(params),
//     version: '2023-10-31',
//   });
// };

export interface CommandInputProps extends CommonProps {
  prompt?: string;
  isWaiting?: boolean;
  focusRef?: InputCaptureProps['focusRef'];
  agentType: string;
}

export const CommandInput = memo<CommandInputProps>(
  ({ prompt = '', focusRef, agentType, ...commonProps }) => {
    useInputHints();
    const getTestId = useTestIdGenerator(useDataTestSubj());
    const dispatch = useConsoleStateDispatch();
    const { rightOfCursorText, leftOfCursorText, fullTextEntered, enteredCommand, parsedInput } =
      useWithInputTextEntered();
    const visibleState = useWithInputVisibleState();
    const isPopoverOpen = !!useWithInputShowPopover();
    const commandList = useWithCommandList();
    const [isKeyInputBeingCaptured, setIsKeyInputBeingCaptured] = useState(false);
    const [commandToExecute, setCommandToExecute] = useState<ExecuteCommandPayload | undefined>(
      undefined
    );
    const [popoverWidth, setPopoverWidth] = useState('94vw');

    const _focusRef: InputCaptureProps['focusRef'] = useRef(null);
    const keyCaptureFocusRef = focusRef || _focusRef;

    const inputContainerClassname = useMemo(() => {
      return classNames({
        cmdInput: true,
        hasFocus: isKeyInputBeingCaptured,
        error: visibleState === 'error',
        withPopover: isPopoverOpen,
      });
    }, [isKeyInputBeingCaptured, isPopoverOpen, visibleState]);

    const disableArrowButton = useMemo(
      () => fullTextEntered.trim().length === 0,
      [fullTextEntered]
    );

    const userInput = useMemo(() => {
      return new EnteredInput(leftOfCursorText, rightOfCursorText, parsedInput, enteredCommand);
    }, [enteredCommand, leftOfCursorText, parsedInput, rightOfCursorText]);

    const handleOnResize = useCallback<EuiResizeObserverProps['onResize']>(({ width }) => {
      if (width > 0) {
        setPopoverWidth(`${width}px`);
      }
    }, []);

    const handleSubmitButton = useCallback<MouseEventHandler>(() => {
      if (!enteredCommand && agentType === 'crowdstrike') {
        setCommandToExecute({
          input: `shell --command "${userInput.getFullText(true)}"`,
          enteredCommand: {
            argState: {},
            argsWithValueSelectors: undefined,
            commandDefinition: commandList.filter((cmd) => cmd.name === 'shell')[0],
          },
          parsedInput: {
            name: 'shell',
            args: {
              command: [userInput.getFullText(true)],
            },
            hasArgs: true,
            hasArg: (argName: string) => argName === 'command',
            input: `shell --command "${userInput.getFullText(true)}"`,
          },
        });
      } else {
        setCommandToExecute({
          input: userInput.getFullText(true),
          enteredCommand,
          parsedInput,
        });
      }
    }, [commandList, enteredCommand, parsedInput, userInput]);
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

        if (isPopoverOpen) {
          dispatch({ type: 'updateInputPopoverState', payload: { show: undefined } });
        }
      },
      [dispatch, isPopoverOpen, keyCaptureFocusRef]
    );

    const handleInputCapture = useCallback<InputCaptureProps['onCapture']>(
      ({ value, selection, eventDetails }) => {
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
          payload: ({
            leftOfCursorText: prevLeftOfCursor,
            rightOfCursorText: prevRightOfCursor,
            enteredCommand: prevEnteredCommand,
            parsedInput: prevParsedInput,
          }) => {
            const inputText = new EnteredInput(
              prevLeftOfCursor,
              prevRightOfCursor,
              prevParsedInput,
              prevEnteredCommand
            );

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
                if (!enteredCommand && agentType === 'crowdstrike') {
                  setCommandToExecute({
                    input: `shell --command "${inputText.getFullText(true)}"`,
                    enteredCommand: {
                      argState: {},
                      argsWithValueSelectors: undefined,
                      commandDefinition: commandList.filter((cmd) => cmd.name === 'shell')[0],
                    },
                    parsedInput: {
                      name: 'shell',
                      args: {
                        command: [inputText.getFullText(true)],
                      },
                      hasArgs: true,
                      hasArg: (argName: string) => argName === 'command',
                      input: `shell --command "${inputText.getFullText(true)}"`,
                    },
                  });
                } else {
                  setCommandToExecute({
                    input: inputText.getFullText(true),
                    enteredCommand:
                      prevEnteredCommand as ConsoleDataState['input']['enteredCommand'],
                    parsedInput: prevParsedInput,
                  });
                }
                inputText.clear();
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
              leftOfCursorText: inputText.getLeftOfCursorText(),
              rightOfCursorText: inputText.getRightOfCursorText(),
              argState: inputText.getArgState(),
            };
          },
        });
      },
      [commandList, dispatch, enteredCommand]
    );

    // Execute the command if one was ENTER'd.
    useEffect(() => {
      if (commandToExecute) {
        dispatch({ type: 'executeCommand', payload: commandToExecute });
        setCommandToExecute(undefined);

        // reset input
        dispatch({
          type: 'updateInputTextEnteredState',
          payload: {
            leftOfCursorText: '',
            rightOfCursorText: '',
          },
        });
      }
    }, [commandToExecute, dispatch]);

    return (
      <InputAreaPopover width={popoverWidth}>
        <EuiResizeObserver onResize={handleOnResize}>
          {(resizeRef) => {
            return (
              <CommandInputContainer
                {...commonProps}
                className={inputContainerClassname}
                onClick={handleTypingAreaClick}
                ref={resizeRef}
                data-test-subj={getTestId('cmdInput-container')}
              >
                <EuiFlexGroup responsive={false} alignItems="center" gutterSize="xs">
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
                      <InputDisplay
                        leftOfCursor={userInput.getLeftOfCursorRenderingContent()}
                        rightOfCursor={userInput.getRightOfCursorRenderingContent()}
                      />
                    </InputCapture>
                    <InputPlaceholder />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonIcon
                      data-test-subj={getTestId('inputTextSubmitButton')}
                      aria-label="submit-command"
                      iconType="playFilled"
                      color="primary"
                      isDisabled={disableArrowButton}
                      onClick={handleSubmitButton}
                    />
                  </EuiFlexItem>
                  <EuiSpacer size="s" />
                </EuiFlexGroup>
              </CommandInputContainer>
            );
          }}
        </EuiResizeObserver>
      </InputAreaPopover>
    );
  }
);
CommandInput.displayName = 'CommandInput';
