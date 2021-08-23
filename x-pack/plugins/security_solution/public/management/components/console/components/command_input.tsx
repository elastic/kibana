/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  memo,
  useCallback,
  KeyboardEventHandler,
  MutableRefObject,
  useState,
  useRef,
} from 'react';
import { CommonProps } from '@elastic/eui';
import styled from 'styled-components';
import { pick } from 'lodash';

const CommandInputContainer = styled.div`
  .cursor {
    display: inline-block;
    width: 0.5em;
    height: 1em;
    background-color: ${({ theme }) => theme.eui.euiCodeBlockColor};

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
    }
  }
`;

export interface CommandInputProps extends CommonProps {
  prompt?: string;
}

export const CommandInput = memo<CommandInputProps>(({ prompt = '>', ...commonProps }) => {
  const [textEntered, setTextEntered] = useState<string>('');
  const focusRef: KeyCaptureProps['focusRef'] = useRef(null);

  const handleTypingAreaClick = useCallback(() => {
    if (focusRef.current) {
      focusRef.current();
    }
  }, []);

  const handleKeyCapture = useCallback<KeyCaptureProps['onCapture']>(({ value, eventDetails }) => {
    eventDetails;
    setTextEntered((prevState) => {
      return prevState + value;
    });
  }, []);

  return (
    <CommandInputContainer {...commonProps}>
      <span className="eui-displayInlineBlock">{prompt}</span>
      <span>
        <span>{textEntered}</span>
        <span className="cursor" />
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events */}
        <span className="eui-displayInlineBlock" onClick={handleTypingAreaClick}>
          <KeyCapture onCapture={handleKeyCapture} focusRef={focusRef} />
        </span>
      </span>
    </CommandInputContainer>
  );
});
CommandInput.displayName = 'CommandInput';

interface KeyCaptureProps {
  onCapture: (params: {
    value: string | undefined;
    eventDetails: Pick<
      KeyboardEvent,
      'key' | 'altKey' | 'ctrlKey' | 'code' | 'keyCode' | 'metaKey' | 'repeat' | 'shiftKey'
    >;
  }) => void;
  focusRef?: MutableRefObject<(() => void) | null>;
}
const KeyCapture = memo<KeyCaptureProps>(({ onCapture, focusRef }) => {
  const handleKeyDown = useCallback<KeyboardEventHandler<HTMLInputElement>>(
    (ev) => {
      onCapture({
        value: ev.currentTarget.value,
        eventDetails: pick(ev, [
          'key',
          'altKey',
          'ctrlKey',
          'code',
          'keyCode',
          'metaKey',
          'repeat',
          'shiftKey',
        ]),
      });
    },
    [onCapture]
  );

  const inputRef = useRef<HTMLInputElement | null>(null);

  const setFocus = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  if (focusRef) {
    focusRef.current = setFocus;
  }

  return (
    <input
      className="invisible-input"
      spellCheck="false"
      value=""
      onInput={handleKeyDown}
      ref={inputRef}
    />
  );
});
KeyCapture.displayName = 'KeyCapture';
