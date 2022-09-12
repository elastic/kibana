/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  KeyboardEventHandler,
  KeyboardEvent,
  MutableRefObject,
  PropsWithChildren,
  ClipboardEventHandler,
} from 'react';
import React, { memo, useCallback, useMemo, useRef } from 'react';
import { pick } from 'lodash';
import styled from 'styled-components';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import { useDataTestSubj } from '../../../hooks/state_selectors/use_data_test_subj';

const InputCaptureContainer = styled.div`
  .invisible-input {
    // Tried to find a way to not use '!important', but cant seem to figure
    // out right combination of pseudo selectors
    outline: none !important;
  }
`;

/**
 * Interface exposed by the `InputCapture` component that allows for interaction
 * with the component's focus/blur states.
 */
interface InputFocusInterface {
  focus: (force?: boolean) => void;
  blur: () => void;
}

export type InputCaptureProps = PropsWithChildren<{
  onCapture: (params: {
    /** The keyboard key value that was entered by the user */
    value: string | undefined;
    /** Any text that is selected/highlighted when user clicked the keyboard key */
    selection: string;
    /** Keyboard control keys from the keyboard event */
    eventDetails: Pick<
      KeyboardEvent,
      'key' | 'altKey' | 'ctrlKey' | 'keyCode' | 'metaKey' | 'repeat' | 'shiftKey'
    >;
  }) => void;
  /** Sets an interface that allows interactions with this component's focus/blur states */
  focusRef?: MutableRefObject<InputFocusInterface | null>;
  /** Callback triggered whenever Focus/Blur events are triggered */
  onChangeFocus?: (hasFocus: boolean) => void;
}>;

/**
 * Component that will capture keyboard and other user input (ex. paste) that
 * occur within this component
 */
export const InputCapture = memo<InputCaptureProps>(
  ({ onCapture, focusRef, onChangeFocus, children }) => {
    const getTestId = useTestIdGenerator(useDataTestSubj());
    // Reference to the `<div>` that take in focus (`tabIndex`)
    const focusEleRef = useRef<HTMLDivElement | null>(null);

    const getTextSelection = useCallback((): string => {
      if (focusEleRef.current) {
        const selection = document.getSelection();
        const selectionText = selection?.toString() ?? '';

        if (!selection || selectionText.length === 0) {
          return '';
        }

        // Determine if the text selection is only from inside the text input area
        // (ex. User could have selected text that also capture content outside of the input area)
        if (
          focusEleRef.current?.contains(selection.focusNode) &&
          focusEleRef.current?.contains(selection.anchorNode)
        ) {
          return selectionText;
        }

        selection.removeAllRanges();
        return '';
      }

      return '';
    }, []);

    const handleOnKeyDown = useCallback<KeyboardEventHandler>(
      (ev) => {
        // allows for clipboard events to be captured via onPaste event handler
        if (ev.metaKey || ev.ctrlKey) {
          return;
        }

        // checking to ensure that the key is not a control character. Control character's `.key`
        // are at least two characters long and because we are handling `onKeyDown` we know that
        // a printable `.key` will always be just one character long.
        const newValue = /^[\w\d]{2}/.test(ev.key) ? '' : ev.key;

        const eventDetails = pick(ev, [
          'key',
          'altKey',
          'ctrlKey',
          'keyCode',
          'metaKey',
          'repeat',
          'shiftKey',
        ]);

        onCapture({
          value: newValue,
          selection: getTextSelection(),
          eventDetails,
        });
      },
      [getTextSelection, onCapture]
    );

    const handleOnPaste = useCallback<ClipboardEventHandler>(
      (ev) => {
        const value = ev.clipboardData.getData('text');

        // hard-coded for use in onCapture and future keyboard functions
        const eventDetails = {
          altKey: false,
          ctrlKey: false,
          key: 'Meta',
          keyCode: 91,
          metaKey: true,
          repeat: false,
          shiftKey: false,
        };

        onCapture({
          value,
          selection: getTextSelection(),
          eventDetails,
        });
      },
      [getTextSelection, onCapture]
    );

    const handleOnFocus = useCallback(() => {
      if (onChangeFocus) {
        onChangeFocus(true);
      }
    }, [onChangeFocus]);

    const handleOnBlur = useCallback(() => {
      if (onChangeFocus) {
        onChangeFocus(false);
      }
    }, [onChangeFocus]);

    const focusInterface = useMemo<InputFocusInterface>(() => {
      return {
        focus: (force: boolean = false) => {
          // If user selected text and `force` is not true, then don't focus (else they lose selection)
          if (
            (!force && (window.getSelection()?.toString() ?? '').length > 0) ||
            document.activeElement === focusEleRef.current
          ) {
            return;
          }

          focusEleRef.current?.focus();
        },

        blur: () => {
          // only blur if the input has focus
          if (focusEleRef.current && document.activeElement === focusEleRef.current) {
            focusEleRef.current?.blur();
          }
        },
      };
    }, []);

    if (focusRef) {
      focusRef.current = focusInterface;
    }

    return (
      <InputCaptureContainer
        data-test-subj={getTestId('inputCapture')}
        onKeyDown={handleOnKeyDown}
        onPaste={handleOnPaste}
      >
        <div
          tabIndex={0}
          ref={focusEleRef}
          className="invisible-input"
          data-test-subj={getTestId('keyCapture-input')}
          onBlur={handleOnBlur}
          onFocus={handleOnFocus}
        >
          {children}
        </div>
      </InputCaptureContainer>
    );
  }
);
InputCapture.displayName = 'InputCapture';
