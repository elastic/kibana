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
      color: ${({ theme }) => theme.eui.euiCodeBlockBackgroundColor};
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
  focusRef?: MutableRefObject<(() => void) | null>;
}

export const KeyCapture = memo<KeyCaptureProps>(({ onCapture, focusRef }) => {
  const [, setLastInput] = useState('');

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

  const setFocus = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  if (focusRef) {
    focusRef.current = setFocus;
  }

  return (
    <KeyCaptureContainer>
      <input
        className="invisible-input"
        spellCheck="false"
        value=""
        onInput={handleOnInput}
        onKeyUp={handleOnKeyUp}
        ref={inputRef}
      />
    </KeyCaptureContainer>
  );
});
KeyCapture.displayName = 'KeyCapture';
