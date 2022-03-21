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
  useRef,
  useState,
} from 'react';
import { pick } from 'lodash';
import styled from 'styled-components';
import { CommonProps } from '@elastic/eui';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';
import { useDataTestSubj } from '../../hooks/state_selectors/use_data_test_subj';

const NOOP = () => undefined;

const KeyCaptureContainer = styled.span`
  display: inline-block;
  position: relative;
  width: 1px;
  height: 1em;
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
      left: -100px;
      top: -100px;
    }
  }
`;

export interface KeyCaptureProps {
  onCapture: (params: {
    value: string | undefined;
    eventDetails: Pick<
      KeyboardEvent,
      'key' | 'altKey' | 'ctrlKey' | 'keyCode' | 'metaKey' | 'repeat' | 'shiftKey'
    >;
  }) => void;
  onStateChange?: (isCapturing: boolean) => void;
  focusRef?: MutableRefObject<((force?: boolean) => void) | null>;
}

/**
 * Key Capture is an invisible INPUT field that we set focus to when the user clicks inside of
 * the console. It's sole purpose is to capture what the user types, which is then pass along to be
 * displayed in a more UX friendly way
 */
export const KeyCapture = memo<KeyCaptureProps>(({ onCapture, focusRef, onStateChange }) => {
  const [, setLastInput] = useState('');
  const getTestId = useTestIdGenerator(useDataTestSubj());

  const handleBlurAndFocus = useCallback<FormEventHandler>(
    (ev) => {
      if (!onStateChange) {
        return;
      }

      onStateChange(ev.type === 'focus');
    },
    [onStateChange]
  );

  const handleOnKeyUp = useCallback<KeyboardEventHandler<HTMLInputElement>>(
    (ev) => {
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
    [onCapture]
  );

  const handleOnInput = useCallback<FormEventHandler<HTMLInputElement>>((ev) => {
    const newValue = ev.currentTarget.value;

    setLastInput((prevState) => {
      return `${prevState || ''}${newValue}`;
    });
  }, []);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const setFocus = useCallback((force: boolean = false) => {
    // If user selected text and `force` is not true, then don't focus (else they lose selection)
    if (!force && (window.getSelection()?.toString() ?? '').length > 0) {
      return;
    }

    inputRef.current?.focus();
  }, []);

  if (focusRef) {
    focusRef.current = setFocus;
  }

  // FIXME:PT probably need to add `aria-` type properties to the input?
  return (
    <KeyCaptureContainer data-test-subj={getTestId('keyCapture')}>
      <input
        className="invisible-input"
        data-test-subj={getTestId('keyCapture-input')}
        spellCheck="false"
        value=""
        onInput={handleOnInput}
        onKeyUp={handleOnKeyUp}
        onBlur={handleBlurAndFocus}
        onFocus={handleBlurAndFocus}
        onChange={NOOP} // this just silences Jest output warnings
        ref={inputRef}
      />
    </KeyCaptureContainer>
  );
});
KeyCapture.displayName = 'KeyCapture';
