/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  FormEventHandler,
  KeyboardEventHandler,
  memo,
  MutableRefObject,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
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
  //    1. user presses a keyboard key
  //    2. `input` event is triggered - we store the letter typed
  //    3. the next event to be triggered (after `input`) that we listen for is `keyup`,
  //       and when that is triggered, we take the input letter (already stored) and
  //       call `onCapture()` with it and then set the lastInput state back to an empty string
  const [, setLastInput] = useState('');
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

  const handleOnKeyUp = useCallback<KeyboardEventHandler<HTMLInputElement>>(
    (ev) => {
      // There is a condition (still not clear how it is actually happening) where the `Enter` key
      // event from the EuiSelectable component gets captured here by the Input. Its likely due to
      // the sequence of events between keyup, focus and the Focus trap component having the
      // `returnFocus` on by default.
      // To avoid having that key Event from actually being processed, we check for this custom
      // property on the event and skip processing it if we find it. This property is currently
      // set by the CommandInputHistory (using EuiSelectable).

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

      const eventDetails = pick(ev, [
        'key',
        'altKey',
        'ctrlKey',
        'keyCode',
        'metaKey',
        'repeat',
        'shiftKey',
      ]);

      setLastInput((value) => {
        onCapture({
          value,
          eventDetails,
        });

        return '';
      });
    },
    [isCapturing, onCapture]
  );

  const handleOnInput = useCallback<FormEventHandler<HTMLInputElement>>((ev) => {
    const newValue = ev.currentTarget.value;

    setLastInput((prevState) => {
      return `${prevState || ''}${newValue}`;
    });
  }, []);

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
        onInput={handleOnInput}
        onKeyUp={handleOnKeyUp}
        onBlur={handleInputOnBlur}
        onFocus={handleInputOnFocus}
        onChange={NOOP} // this just silences Jest output warnings
        ref={inputRef}
      />
    </KeyCaptureContainer>
  );
});
KeyCapture.displayName = 'KeyCapture';
