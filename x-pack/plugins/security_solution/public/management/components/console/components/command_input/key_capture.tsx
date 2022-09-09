/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ClipboardEventHandler,
  FormEventHandler,
  KeyboardEventHandler,
  MutableRefObject,
} from 'react';
import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import { pick } from 'lodash';
import styled from 'styled-components';
import { useTestIdGenerator } from '../../../../hooks/use_test_id_generator';
import { useDataTestSubj } from '../../hooks/state_selectors/use_data_test_subj';

const NOOP = () => undefined;

const KeyCaptureContainer = styled.span`
  display: inline-block;
  position: absolute;
  width: 1px;
  height: 1em;
  left: -110vw;
  top: -110vh;
  overflow: hidden;

  .invisible-input {
    &,
    &:focus {
      border: none;
      background-image: none;
      background-color: transparent;
      -webkit-box-shadow: none;
      -moz-box-shadow: none;
      box-shadow: none;
      animation: none !important;
      width: 1ch !important;
      position: absolute;
    }
  }
`;

interface KeyCaptureFocusInterface {
  focus: (force?: boolean) => void;
  blur: () => void;
}

export interface KeyCaptureProps {
  onCapture: (params: {
    value: string | undefined;
    eventDetails: Pick<
      KeyboardEvent,
      'key' | 'altKey' | 'ctrlKey' | 'keyCode' | 'metaKey' | 'repeat' | 'shiftKey'
    >;
  }) => void;
  onStateChange?: (isCapturing: boolean) => void;
  focusRef?: MutableRefObject<KeyCaptureFocusInterface | null>;
}

/**
 * Key Capture is an invisible INPUT field that we set focus to when the user clicks inside of
 * the console. It's sole purpose is to capture what the user types, which is then pass along to be
 * displayed in a more UX friendly way
 */
export const KeyCapture = memo<KeyCaptureProps>(({ onCapture, focusRef, onStateChange }) => {
  // We don't need the actual value that was last input in this component, because
  // `setLastInput()` is used with a function that returns the typed character.
  // This state is used like this:
  //    1. User presses a keyboard key down
  //    2. We store the key that was pressed
  //    3. When the 'keyup' event is triggered, we call `onCapture()`
  //        with all of the character that were entered
  //    4. We set the last input back to an empty string
  const getTestId = useTestIdGenerator(useDataTestSubj());
  const inputRef = useRef<HTMLInputElement | null>(null);
  const blurInputRef = useRef<HTMLInputElement | null>(null);

  const [isCapturing, setIsCapturing] = useState(false);

  const handleInputOnBlur = useCallback(() => {
    setIsCapturing(false);

    if (onStateChange) {
      onStateChange(false);
    }
  }, [onStateChange]);

  const handleInputOnFocus = useCallback<FormEventHandler>(
    (ev) => {
      setIsCapturing(true);

      if (onStateChange) {
        onStateChange(true);
      }
    },
    [onStateChange]
  );

  const handleInputOnPaste = useCallback<ClipboardEventHandler>(
    (ev) => {
      const value = ev.clipboardData.getData('text');
      ev.stopPropagation();

      // hard-coded for use in onCapture and future keyboard functions
      const metaKey = {
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
        eventDetails: metaKey,
      });
    },
    [onCapture]
  );

  // 1. Determine if the key press is one that we need to store ex) letters, digits, values that we see
  // 2. If the user clicks a key we don't need to store as text, but we need to do logic with ex) backspace, delete, l/r arrows, we must call onCapture
  const handleOnKeyDown = useCallback<KeyboardEventHandler>(
    (ev) => {
      // checking to ensure that the key is not a control character
      const newValue = /^[\w\d]{2}/.test(ev.key) ? '' : ev.key;

      // @ts-expect-error
      if (!isCapturing || ev._CONSOLE_IGNORE_KEY) {
        // @ts-expect-error
        if (ev._CONSOLE_IGNORE_KEY) {
          // @ts-expect-error
          ev._CONSOLE_IGNORE_KEY = false;
        }

        return;
      }

      ev.stopPropagation();

      // allows for clipboard events to be captured via onPaste event handler
      if (ev.metaKey || ev.ctrlKey) {
        return;
      }

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
        eventDetails,
      });
    },
    [isCapturing, onCapture]
  );

  const keyCaptureFocusMethods = useMemo<KeyCaptureFocusInterface>(() => {
    return {
      focus: (force: boolean = false) => {
        // If user selected text and `force` is not true, then don't focus (else they lose selection)
        if (!force && (window.getSelection()?.toString() ?? '').length > 0) {
          return;
        }

        inputRef.current?.focus();
      },

      blur: () => {
        // only blur if the input has focus
        if (inputRef.current && document.activeElement === inputRef.current) {
          blurInputRef.current?.focus();
        }
      },
    };
  }, []);

  if (focusRef) {
    focusRef.current = keyCaptureFocusMethods;
  }

  return (
    <KeyCaptureContainer data-test-subj={getTestId('keyCapture')} aria-hidden="true" tabIndex={-1}>
      <input value="" ref={blurInputRef} tabIndex={-1} onChange={NOOP} />

      <input
        className="invisible-input"
        data-test-subj={getTestId('keyCapture-input')}
        spellCheck="false"
        value=""
        tabIndex={-1}
        onKeyDown={handleOnKeyDown}
        onBlur={handleInputOnBlur}
        onFocus={handleInputOnFocus}
        onPaste={handleInputOnPaste}
        onChange={NOOP} // this just silences Jest output warnings
        ref={inputRef}
      />
    </KeyCaptureContainer>
  );
});
KeyCapture.displayName = 'KeyCapture';
